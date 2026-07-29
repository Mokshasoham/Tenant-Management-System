import { Server } from 'socket.io';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import logger from '../utils/logger.js';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';

const socketHandler = (server) => {
    const io = new Server(server, {
        cors: {
            origin: config.CORS_ORIGIN || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Authenticate socket connections
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));

        jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
            if (err) return next(new Error('Authentication error'));
            socket.user = decoded;
            next();
        });
    });

    const onlineUsers = new Map(); // userId -> socketId

    io.on('connection', async (socket) => {
        const userId = socket.user.userId;
        onlineUsers.set(userId, socket.id);
        
        logger.info(`User connected: ${userId} (Socket: ${socket.id})`);

        // Update user status
        await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
        io.emit('userStatusUpdate', { userId, isOnline: true });

        // Join personal room for private messages
        socket.join(userId);

        // --- Event Handlers ---

        // 1. Send Message
        socket.on('sendMessage', async (data) => {
            const { receiverId, content, attachments, propertyId } = data;
            
            try {
                const message = await Message.create({
                    sender: userId,
                    receiver: receiverId,
                    content,
                    attachments,
                    property: propertyId
                });

                // Confirm back to sender
                socket.emit('messageSent', message);
                // Send to receiver
                io.to(receiverId).emit('newMessage', message);

                // Create a notification for the receiver
                await Notification.create({
                    recipient: receiverId,
                    type: 'message',
                    title: 'New Message',
                    message: `You received a new message: "${content.substring(0, 30)}..."`,
                    link: '/messages',
                    relatedId: message._id,
                    relatedModel: 'Message'
                });

                // Emit notification event to receiver
                io.to(receiverId).emit('newNotification', { type: 'message', message: 'New message received' });
                
                logger.info(`Real-time message from ${userId} to ${receiverId}`);
            } catch (err) {
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // 2. Typing Indicator
        socket.on('typing', (data) => {
            const { receiverId, isTyping } = data;
            io.to(receiverId).emit('userTyping', { userId, isTyping });
        });

        // 3. Mark Message as Read
        socket.on('markAsRead', async (data) => {
            const { messageIds, senderId } = data;
            try {
                await Message.updateMany(
                    { _id: { $in: messageIds }, receiver: userId },
                    { read: true, readAt: new Date() }
                );
                // Notify sender that their messages were read
                io.to(senderId).emit('messagesRead', { receiverId: userId, messageIds });
            } catch (err) {
                 logger.error(`Error marking messages as read: ${err.message}`);
            }
        });

        // 4. Delete Message
        socket.on('deleteMessage', async (data) => {
            const { messageId, receiverId } = data;
            try {
                await Message.findByIdAndUpdate(messageId, { isDeleted: true, deletedBy: userId });
                io.to(receiverId).emit('messageDeleted', { messageId });
                socket.emit('messageDeleted', { messageId });
            } catch (err) {
                logger.error(`Error deleting message: ${err.message}`);
            }
        });

        // 5. Disconnect
        socket.on('disconnect', async () => {
            onlineUsers.delete(userId);
            logger.info(`User disconnected: ${userId}`);
            
            await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
            io.emit('userStatusUpdate', { userId, isOnline: false, lastSeen: new Date() });
        });
    });

    return io;
};

export default socketHandler;
