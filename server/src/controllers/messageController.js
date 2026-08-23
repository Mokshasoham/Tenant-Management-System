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

    // 3. Authorize relationship: Tenant <-> Booking/Lease <-> Property <-> Manager
    const authCheck = await messagingAuthService.verifyRelationship(
        senderId,
        receiverId,
        propertyId,
        req.user.role
    );

    if (!authCheck.isAuthorized) {
        throw new AppError(
            authCheck.reason || 'Forbidden: You can only message users connected through a confirmed property booking or lease.',
            403
        );
    }

    // 4. Create Message with property & booking association
    const message = await Message.create({
        sender: senderId,
        receiver: receiverId,
        content: content || '',
        property: authCheck.propertyId || propertyId,
        booking: authCheck.bookingId,
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

    // If no active relationship, check if prior conversation history exists
    if (!authCheck.isAuthorized && req.user.role !== 'admin') {
        const historyCount = await Message.countDocuments({
            $or: [
                { sender: currentUserId, receiver: otherUserId },
                { sender: otherUserId, receiver: currentUserId },
            ]
        });

        if (historyCount === 0) {
            throw new AppError('Forbidden: Access denied to conversation with this user.', 403);
        }
    }

    const messages = await Message.find({
        $or: [
            { sender: currentUserId, receiver: otherUserId },
            { sender: otherUserId, receiver: currentUserId },
        ],
    })
    .sort({ createdAt: 1 })
    .populate('property', 'name title');

    res.status(200).json({
        success: true,
        data: messages.map(m => resolveMessageUrls(m, req)),
    });
});

export const getConversations = asyncHandler(async (req, res) => {
    const currentUserId = req.user.userId || req.user._id || req.user.id;

    // Find all messages where user is involved
    const messages = await Message.find({
        $or: [{ sender: currentUserId }, { receiver: currentUserId }],
    })
    .sort({ createdAt: -1 })
    .populate('sender receiver', 'firstName lastName avatar email role')
    .populate('property', 'name title');

    // Get authorized partners to enrich active conversations
    const authorizedPartners = await messagingAuthService.getAuthorizedPartners(currentUserId, req.user.role);
    const partnerMap = new Map();
    authorizedPartners.forEach(p => partnerMap.set(String(p._id), p));

    // Group by other user
    const conversationsMap = new Map();

    for (const msg of messages) {
        if (!msg.sender || !msg.receiver) continue;
        const otherUser = msg.sender._id.toString() === String(currentUserId) ? msg.receiver : msg.sender;
        const otherUserId = otherUser._id.toString();

        if (!conversationsMap.has(otherUserId)) {
            const partnerInfo = partnerMap.get(otherUserId);
            const propName = msg.property?.name || msg.property?.title || partnerInfo?.propertyName || null;
            const propId = msg.property?._id || partnerInfo?.propertyId || null;

            conversationsMap.set(otherUserId, {
                lastMessage: resolveMessageUrls(msg, req),
                user: otherUser,
                property: propId ? { _id: propId, name: propName } : null,
                bookingStatus: partnerInfo?.bookingStatus || 'Active'
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
