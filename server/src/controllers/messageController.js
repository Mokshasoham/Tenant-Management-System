import Message from '../models/Message.js';
import User from '../models/User.js';
import Property from '../models/Property.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import { uploadFileBuffer } from '../services/fileService.js';
import NotificationService from '../services/NotificationService.js';
import messagingAuthService from '../services/messagingAuthService.js';

const resolveMessageUrls = (message, req) => {
    if (!message) return message;
    const msgObj = message.toObject ? message.toObject() : message;
    if (msgObj.attachments && msgObj.attachments.length > 0) {
        const protocol = req?.headers?.['x-forwarded-proto'] || req?.protocol || 'http';
        const host = req?.get ? req.get('host') : (req?.headers?.host || 'localhost');
        msgObj.attachments = msgObj.attachments.map(att => {
            if (att.fileId) {
                att.url = `${protocol}://${host}/api/files/download/${att.fileId}`;
            } else if (att.url && !att.url.startsWith('http')) {
                att.url = `${protocol}://${host}/${att.url.startsWith('/') ? '' : '/'}${att.url}`;
            }
            return att;
        });
    }
    return msgObj;
};

export const getAvailableUsers = asyncHandler(async (req, res) => {
    const currentUserId = req.user.userId || req.user._id || req.user.id;
    const userRole = req.user.role;

    const partners = await messagingAuthService.getAuthorizedPartners(currentUserId, userRole);

    res.status(200).json({
        success: true,
        data: partners
    });
});

export const sendMessage = asyncHandler(async (req, res) => {
    // 1. NEVER trust senderId from request body — derive strictly from authenticated token
    const senderId = req.user.userId || req.user._id || req.user.id;
    const { receiverId, content, propertyId } = req.body;

    if (!receiverId) {
        throw new AppError('Receiver ID is required', 400);
    }
    if (!content && (!req.body.attachments || req.body.attachments.length === 0)) {
        throw new AppError('Message content or attachment is required', 400);
    }

    // 2. Verify receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
        throw new AppError('Receiver not found', 404);
    }

    // 3. Authorize relationship: Tenant <-> Active Lease <-> Property <-> Manager
    const authCheck = await messagingAuthService.verifyRelationship(
        senderId,
        receiverId,
        propertyId,
        req.user.role
    );

    if (!authCheck.isAuthorized) {
        throw new AppError(
            authCheck.reason || 'Forbidden: You can only message users with an active lease relationship.',
            403
        );
    }

    // 4. Create Message with property association
    const message = await Message.create({
        sender: senderId,
        receiver: receiverId,
        content: content || '',
        property: authCheck.propertyId || propertyId,
        attachments: req.body.attachments || []
    });

    const sender = await User.findById(senderId).select('name firstName lastName email');
    const senderName = sender ? (sender.name || `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.email) : 'A User';

    // 5. Notify receiver in Notification Bell dropdown
    try {
        await NotificationService.notify({
            recipient: receiverId,
            title: `New Message from ${senderName}`,
            message: content ? (content.length > 120 ? `${content.substring(0, 120)}...` : content) : 'You received a new message.',
            category: 'messages',
            priority: 'medium',
            severity: 'information',
            actionUrl: '/messages',
            sourceModule: 'messages',
            source: 'USER_CHAT',
            entityType: 'Message',
            entityId: message._id,
            metadata: { messageId: message._id, senderId, propertyId: authCheck.propertyId }
        });
    } catch (notifErr) {
        logger.warn(`Failed to create notification for message ${message._id}: ${notifErr.message}`);
    }

    logger.info(`Message sent from ${senderId} to ${receiverId} (Property: ${authCheck.propertyId || 'none'})`);

    res.status(201).json({
        success: true,
        data: resolveMessageUrls(message, req),
    });
});

export const getMessages = asyncHandler(async (req, res) => {
    const { otherUserId } = req.params;
    const currentUserId = req.user.userId || req.user._id || req.user.id;

    // Check relationship authorization
    const authCheck = await messagingAuthService.verifyRelationship(
        currentUserId,
        otherUserId,
        null,
        req.user.role
    );

    // Strict authorization: historical messages do NOT grant access
    if (!authCheck.isAuthorized && req.user.role !== 'admin') {
        throw new AppError('Forbidden: Access denied to conversation with this user.', 403);
    }

    const filter = {
        $or: [
            { sender: currentUserId, receiver: otherUserId },
            { sender: otherUserId, receiver: currentUserId },
        ],
        isDeleted: false
    };

    // Scoped strictly to the active property relationship to prevent cross-lease history bleed (Correction 3)
    if (authCheck.propertyId && req.user.role !== 'admin') {
        filter.property = authCheck.propertyId;
    }

    const messages = await Message.find(filter)
        .sort({ createdAt: 1 })
        .populate('property', 'name title');

    res.status(200).json({
        success: true,
        data: messages.map(m => resolveMessageUrls(m, req)),
    });
});

export const getConversations = asyncHandler(async (req, res) => {
    const currentUserId = req.user.userId || req.user._id || req.user.id;

    // Get authorized partners based strictly on active lease relationships
    const authorizedPartners = await messagingAuthService.getAuthorizedPartners(currentUserId, req.user.role);
    if (!authorizedPartners || authorizedPartners.length === 0) {
        return res.status(200).json({
            success: true,
            data: [],
        });
    }

    const partnerMap = new Map();
    authorizedPartners.forEach(p => partnerMap.set(String(p._id), p));

    // Find all messages where user is involved
    const messages = await Message.find({
        $or: [{ sender: currentUserId }, { receiver: currentUserId }],
        isDeleted: false
    })
    .sort({ createdAt: -1 })
    .populate('sender receiver', 'firstName lastName avatar email role')
    .populate('property', 'name title');

    // Group by other user, strictly enforcing authorized partner & active property isolation
    const conversationsMap = new Map();

    for (const msg of messages) {
        if (!msg.sender || !msg.receiver) continue;
        const otherUser = msg.sender._id.toString() === String(currentUserId) ? msg.receiver : msg.sender;
        const otherUserId = otherUser._id.toString();

        // 1. Strict partner authorization check: must be an authorized active partner
        if (!partnerMap.has(otherUserId)) {
            continue;
        }

        const partnerInfo = partnerMap.get(otherUserId);
        const activePropertyIds = partnerInfo.activePropertyIds || (partnerInfo.propertyId ? [String(partnerInfo.propertyId)] : []);

        // 2. Multi-property isolation check (Correction 3):
        // If message has a property reference, it MUST match one of the partner's active lease properties!
        // This prevents an expired Property A's messages from becoming the preview for active Property B.
        const msgPropId = msg.property?._id ? String(msg.property._id) : (msg.property ? String(msg.property) : null);
        if (msgPropId && activePropertyIds.length > 0 && !activePropertyIds.includes(msgPropId)) {
            continue;
        }

        if (!conversationsMap.has(otherUserId)) {
            const propName = msg.property?.name || msg.property?.title || partnerInfo.propertyName || null;
            const propId = msg.property?._id || partnerInfo.propertyId || null;

            conversationsMap.set(otherUserId, {
                lastMessage: resolveMessageUrls(msg, req),
                user: otherUser,
                property: propId ? { _id: propId, name: propName } : null,
                bookingStatus: partnerInfo.bookingStatus || 'Active Lease'
            });
        }
    }

    res.status(200).json({
        success: true,
        data: Array.from(conversationsMap.values()),
    });
});

export const markAsRead = asyncHandler(async (req, res) => {
    const { senderId } = req.params;
    const currentUserId = req.user.userId || req.user._id || req.user.id;

    // Verify active relationship
    const authCheck = await messagingAuthService.verifyRelationship(currentUserId, senderId, null, req.user.role);
    if (!authCheck.isAuthorized && req.user.role !== 'admin') {
        throw new AppError('Forbidden: Cannot mark messages as read for inactive relationship', 403);
    }

    await Message.updateMany(
        { sender: senderId, receiver: currentUserId, read: false },
        { read: true, readAt: new Date() }
    );

    res.status(200).json({
        success: true,
        message: 'Messages marked as read',
    });
});

export const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user.userId || req.user._id || req.user.id;

    const message = await Message.findById(messageId);
    if (!message) throw new AppError('Message not found', 404);

    if (String(message.sender) !== String(userId) && String(message.receiver) !== String(userId) && req.user.role !== 'admin') {
        throw new AppError('Forbidden: Cannot delete this message', 403);
    }

    message.isDeleted = true;
    message.deletedBy = userId;
    await message.save();

    res.status(200).json({
        success: true,
        message: 'Message deleted for you',
    });
});

export const searchMessages = asyncHandler(async (req, res) => {
    const { query } = req.query;
    const userId = req.user.userId || req.user._id || req.user.id;

    if (!query) throw new AppError('Search query is required', 400);

    // Admin can search all messages
    if (req.user.role === 'admin') {
        const messages = await Message.find({
            $and: [
                { $or: [{ sender: userId }, { receiver: userId }] },
                { content: { $regex: query, $options: 'i' } },
                { isDeleted: false }
            ]
        })
        .sort({ createdAt: -1 })
        .populate('sender receiver', 'firstName lastName avatar')
        .populate('property', 'name title');

        return res.status(200).json({
            success: true,
            data: messages.map(m => resolveMessageUrls(m, req)),
        });
    }

    // For tenant and manager: MUST scope search strictly to currently active authorized relationships (Correction 3)
    const authorizedPartners = await messagingAuthService.getAuthorizedPartners(userId, req.user.role);
    if (!authorizedPartners || authorizedPartners.length === 0) {
        return res.status(200).json({
            success: true,
            data: [],
        });
    }

    const partnerIds = authorizedPartners.map(p => p._id);
    const activePropertyIds = authorizedPartners
        .flatMap(p => p.activePropertyIds || (p.propertyId ? [p.propertyId] : []))
        .filter(Boolean);

    const filterConditions = [
        {
            $or: [
                { sender: userId, receiver: { $in: partnerIds } },
                { sender: { $in: partnerIds }, receiver: userId }
            ]
        },
        { content: { $regex: query, $options: 'i' } },
        { isDeleted: false }
    ];

    if (activePropertyIds.length > 0) {
        filterConditions.push({ property: { $in: activePropertyIds } });
    }

    const messages = await Message.find({ $and: filterConditions })
        .sort({ createdAt: -1 })
        .populate('sender receiver', 'firstName lastName avatar')
        .populate('property', 'name title');

    res.status(200).json({
        success: true,
        data: messages.map(m => resolveMessageUrls(m, req)),
    });
});

export const uploadAttachment = asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const fileRecord = await uploadFileBuffer({
        buffer: req.file.buffer,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        category: 'chat',
        uploaderId: req.user.userId || req.user._id || req.user.id
    });

    res.status(200).json({
        success: true,
        data: {
            fileId: fileRecord._id,
            url: fileRecord.url,
            fileName: fileRecord.filename,
            fileType: fileRecord.mimeType
        }
    });
});
