import Message from '../models/Message.js';
import User from '../models/User.js'
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';

export const getAvailableUsers = asyncHandler(async (req, res) => {
    const currentUser = req.user;
    let users = [];

    if (currentUser.role === 'tenant') {
        // Tenants can message managers and admins
        users = await User.find(
            { role: { $in: ['manager', 'admin'] }, isActive: true },
            'firstName lastName email role'
        );
    } else if (currentUser.role === 'manager') {
        // Managers can message tenants
        users = await User.find(
            { role: 'tenant', isActive: true },
            'firstName lastName email role'
        );
    } else if (currentUser.role === 'admin') {
        // Admins can message everyone
        users = await User.find(
            { _id: { $ne: currentUser.userId }, isActive: true },
            'firstName lastName email role'
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
