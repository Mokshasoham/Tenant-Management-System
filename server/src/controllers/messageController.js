import Message from '../models/Message.js';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import { uploadFileBuffer } from '../services/fileService.js';

const resolveMessageUrls = (message, req) => {
    if (!message) return message;
    const msgObj = message.toObject ? message.toObject() : message;
    if (msgObj.attachments && msgObj.attachments.length > 0) {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
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
    const currentUser = req.user;
    let users = [];

    const userRole = currentUser.role;
    const isTenant = userRole === 'tenant' || userRole === 'user';

    if (isTenant) {
        // Tenants can message managers and admins
        users = await User.find(
            { role: { $in: ['manager', 'admin'] }, isActive: true },
            'firstName lastName email role avatar'
        );
    } else if (userRole === 'manager') {
        // Managers can message tenants
        users = await User.find(
            { role: { $in: ['tenant', 'user'] }, isActive: true },
            'firstName lastName email role avatar'
        );
    } else if (userRole === 'admin') {
        // Admins can message everyone
        users = await User.find(
            { _id: { $ne: currentUser.userId }, isActive: true },
            'firstName lastName email role avatar'
        );
    }

    res.status(200).json({ success: true, data: users });
});


export const sendMessage = asyncHandler(async (req, res) => {
    const { receiverId, content, propertyId } = req.body;
    const senderId = req.user.userId;

    // Verify receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
        throw new AppError('Receiver not found', 404);
    }

    const message = await Message.create({
        sender: senderId,
        receiver: receiverId,
        content,
        property: propertyId,
    });

    logger.info(`Message sent from ${senderId} to ${receiverId}`);

    res.status(201).json({
        success: true,
        data: resolveMessageUrls(message, req),
    });
});

export const getMessages = asyncHandler(async (req, res) => {
    const { otherUserId } = req.params;
    const currentUserId = req.user.userId;

    const messages = await Message.find({
        $or: [
            { sender: currentUserId, receiver: otherUserId },
            { sender: otherUserId, receiver: currentUserId },
        ],
    }).sort({ createdAt: 1 });

    res.status(200).json({
        success: true,
        data: messages.map(m => resolveMessageUrls(m, req)),
    });
});

export const getConversations = asyncHandler(async (req, res) => {
    const currentUserId = req.user.userId;

    // Find all messages where user is involved
    const messages = await Message.find({
        $or: [{ sender: currentUserId }, { receiver: currentUserId }],
    })
        .sort({ createdAt: -1 })
        .populate('sender receiver', 'firstName lastName avatar email role');

    // Group by the "other" user
    const conversationsMap = new Map();

    messages.forEach((msg) => {
        const otherUser = msg.sender._id.toString() === currentUserId ? msg.receiver : msg.sender;
        const otherUserId = otherUser._id.toString();

        if (!conversationsMap.has(otherUserId)) {
            conversationsMap.set(otherUserId, {
                lastMessage: resolveMessageUrls(msg, req),
                user: otherUser,
            });
        }
    });

    res.status(200).json({
        success: true,
        data: Array.from(conversationsMap.values()),
    });
});

export const markAsRead = asyncHandler(async (req, res) => {
    const { senderId } = req.params;
    const currentUserId = req.user.userId;

    await Message.updateMany(
        { sender: senderId, receiver: currentUserId, read: false },
        { read: true }
    );

    res.status(200).json({
        success: true,
        message: 'Messages marked as read',
    });
});

export const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await Message.findById(messageId);
    if (!message) throw new AppError('Message not found', 404);

    // Rule: System allows soft deletion for the user who requested it
    // For simplicity, we flag it as deleted and track who deleted it.
    // In a real multi-user chat, you might need a per-user deletion flag.
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
    const userId = req.user.userId;

    if (!query) throw new AppError('Search query is required', 400);

    const messages = await Message.find({
        $and: [
            { $or: [{ sender: userId }, { receiver: userId }] },
            { content: { $regex: query, $options: 'i' } },
            { isDeleted: false }
        ]
    })
    .sort({ createdAt: -1 })
    .populate('sender receiver', 'firstName lastName avatar');

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
        uploaderId: req.user.userId
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
