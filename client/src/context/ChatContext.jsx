import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from './authStore';
import { messageService } from '../services/api';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const user = useAuthStore((state) => state.user);
    const token = useAuthStore((state) => state.token);
    const [socket, setSocket] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [typingUsers, setTypingUsers] = useState({}); // userId -> boolean
    const [onlineUsers, setOnlineUsers] = useState({}); // userId -> boolean
    const [availableUsers, setAvailableUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Use ref for activeChat to avoid re-initializing socket on every selection
    const activeChatRef = useRef(activeChat);
    useEffect(() => {
        activeChatRef.current = activeChat;
    }, [activeChat]);

    // Initialize Socket
    useEffect(() => {
        if (token) {
            const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
                auth: { token }
            });

            setSocket(newSocket);

            newSocket.on('messageSent', (message) => {
                const currentActive = activeChatRef.current;
                const otherId = currentActive?.user?._id || currentActive?.user?.id || currentActive?._id;
                if (currentActive && (message.receiver === otherId || message.receiver?._id === otherId)) {
                    setMessages((prev) => [...prev, message]);
                }
                fetchConversations();
            });

            newSocket.on('newMessage', (message) => {
                // If the message belongs to the active chat, add it
                const currentActive = activeChatRef.current;
                const otherId = currentActive?.user?._id || currentActive?.user?.id || currentActive?._id;
                if (currentActive && (message.sender === otherId || message.sender?._id === otherId)) {
                    setMessages((prev) => [...prev, message]);
                }
                
                // Update conversation list last message
                fetchConversations();
            });

            newSocket.on('userTyping', ({ userId, isTyping }) => {
                setTypingUsers((prev) => ({ ...prev, [userId]: isTyping }));
            });

            newSocket.on('userStatusUpdate', ({ userId, isOnline }) => {
                setOnlineUsers((prev) => ({ ...prev, [userId]: isOnline }));
            });

            newSocket.on('messageDeleted', ({ messageId }) => {
                setMessages((prev) => prev.filter(m => m._id !== messageId));
                setConversations((prev) => prev.map(c => {
                    if (c.lastMessage?._id === messageId) {
                        return { ...c, lastMessage: { ...c.lastMessage, content: 'Message deleted', isDeleted: true } };
                    }
                    return c;
                }));
            });

            return () => {
                newSocket.off('messageSent');
                newSocket.off('newMessage');
                newSocket.off('userStatusUpdate');
                newSocket.off('userTyping');
                newSocket.off('messageDeleted');
                newSocket.close();
            };
        }
    }, [token]);

    const fetchConversations = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await messageService.getConversations();
            setConversations(res.data || []);
        } catch (err) {
            console.error('Failed to fetch conversations', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchMessages = useCallback(async (otherUserId) => {
        setIsLoading(true);
        try {
            const res = await messageService.getMessages(otherUserId);
            setMessages(res.data || []);
        } catch (err) {
            console.error('Failed to fetch messages', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchAvailableUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await messageService.getAvailableUsers();
            setAvailableUsers(res.data || []);
        } catch (err) {
            console.error('Failed to fetch available users', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const sendMessage = useCallback((receiverId, content, attachments = [], propertyId) => {
        if (socket) {
            socket.emit('sendMessage', { receiverId, content, attachments, propertyId });
        }
    }, [socket]);

    const sendTyping = useCallback((receiverId, isTyping) => {
        if (socket) {
            socket.emit('typing', { receiverId, isTyping });
        }
    }, [socket]);

    const markAsRead = useCallback((otherUserId, messageIds) => {
        if (socket) {
            socket.emit('markAsRead', { senderId: otherUserId, messageIds });
            // Update local state to show read locally
            setMessages((prev) => prev.map(m => messageIds.includes(m._id) ? { ...m, read: true } : m));
        }
    }, [socket]);

    const deleteMessage = useCallback((messageId, receiverId) => {
        if (socket) {
            socket.emit('deleteMessage', { messageId, receiverId });
        }
    }, [socket]);

    const uploadFile = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await messageService.uploadAttachment(formData);
            return res.data; // { url, fileName, fileType }
        } catch (err) {
            console.error('File upload failed', err);
            throw err;
        }
    };

    useEffect(() => {
        if (user) fetchConversations();
    }, [user, fetchConversations]);

    return (
        <ChatContext.Provider value={{
            socket,
            conversations,
            messages,
            activeChat,
            setActiveChat,
            typingUsers,
            onlineUsers,
            availableUsers,
            isLoading,
            fetchConversations,
            fetchMessages,
            fetchAvailableUsers,
            sendMessage,
            sendTyping,
            markAsRead,
            deleteMessage,
            uploadFile
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => useContext(ChatContext);
