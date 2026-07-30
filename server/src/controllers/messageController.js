import Message from '../models/Message.js';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import mongoose from 'mongoose';

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
        data: message,
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
        data: messages,
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
                lastMessage: msg,
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
        data: messages,
    });
});

export const uploadAttachment = asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const fileUrl = `/uploads/chat/${req.file.filename}`;
    
    // Save to FileStorage database backup persistence
    try {
        const FileStorage = mongoose.model('FileStorage');
        const buffer = await fs.promises.readFile(req.file.path);
        await FileStorage.findOneAndUpdate(
            { filename: req.file.filename },
            { filename: req.file.filename, mimeType: req.file.mimetype, data: buffer },
            { upsert: true, new: true }
        );
    } catch (err) {
        logger.error('[FileStorage Chat] Failed to persist file in MongoDB:', err);
    }

    res.status(200).json({
        success: true,
        data: {
            url: fileUrl,
            fileName: req.file.originalname,
            fileType: req.file.mimetype
        }
    });
});
