import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { messageService } from '../services/api';
import useAuthStore from '../context/authStore';
import {
    Send, Search, Plus, MessageSquare, ArrowLeft, MoreVertical,
    Check, CheckCheck, Smile, Paperclip, Phone, Video, X
} from 'lucide-react';
import { cn } from '../utils/cn';

const ROLE_COLORS = {
    admin: { bg: 'bg-violet-500', text: 'text-violet-300', border: 'border-violet-500/20', bubble: 'from-violet-600 to-purple-600' },
    manager: { bg: 'bg-blue-500', text: 'text-blue-300', border: 'border-blue-500/20', bubble: 'from-blue-600 to-cyan-600' },
    tenant: { bg: 'bg-emerald-500', text: 'text-emerald-300', border: 'border-emerald-500/20', bubble: 'from-emerald-600 to-teal-600' },
};

function Avatar({ name, role, size = 'md' }) {
    const colors = ROLE_COLORS[role] || ROLE_COLORS.tenant;
    const sizeClass = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }[size];
    const initials = (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return (
        <div className={cn('rounded-xl flex items-center justify-center font-black text-white flex-shrink-0', sizeClass, colors.bg)}>
            {initials}
        </div>
    );
}

export default function MessagesPage() {
    const user = useAuthStore((state) => state.user);
    if (!user) return null;

    const role = user.role;
    const myTheme = ROLE_COLORS[role] || ROLE_COLORS.tenant;
    const userId = user._id || user.id;

    const [conversations, setConversations] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendingMsg, setSendingMsg] = useState(false);
    const [showNewChat, setShowNewChat] = useState(false);
    const [search, setSearch] = useState('');
    const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'
    const messagesEndRef = useRef(null);
    const pollRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchConversations = useCallback(async () => {
        try {
            const res = await messageService.getConversations();
            setConversations(res.data.data || []);
        } catch { }
    }, []);

    const fetchAvailableUsers = useCallback(async () => {
        try {
            const res = await messageService.getAvailableUsers();
            setAvailableUsers(res.data.data || []);
        } catch { }
    }, []);

    const fetchMessages = useCallback(async (otherId) => {
        if (!otherId) return;
        try {
            const res = await messageService.getMessages(otherId);
            setMessages(res.data.data || []);
            scrollToBottom();
            // Mark as read
            await messageService.markAsRead(otherId).catch(() => { });
        } catch { }
    }, []);

    const location = useLocation();

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const [convRes, userRes] = await Promise.all([fetchConversations(), fetchAvailableUsers()]);
            setLoading(false);

            // Handle location state for pre-booking chat
            if (location.state?.recipientId) {
                const recipient = {
                    _id: location.state.recipientId,
                    firstName: location.state.recipientName?.split(' ')[0] || 'Manager',
                    lastName: location.state.recipientName?.split(' ')[1] || '',
                    role: 'manager'
                };
                handleSelectNewUser(recipient);
                if (location.state.subject) {
                    setNewMessage(`Hi, I'm interested in ${location.state.subject}. `);
                }
            }
        };
        init();
    }, [location.state]);

    // Poll for new messages every 5s when a chat is selected
    useEffect(() => {
        if (!selectedChat) return;
        const otherId = selectedChat.user?._id || selectedChat.user?.id || selectedChat._id || selectedChat.id;
        fetchMessages(otherId);
        pollRef.current = setInterval(() => fetchMessages(otherId), 5000);
        return () => clearInterval(pollRef.current);
    }, [selectedChat, fetchMessages]);

    useEffect(() => { scrollToBottom(); }, [messages]);

    const handleSelectConversation = (conv) => {
        setSelectedChat({ user: conv.user, lastMessage: conv.lastMessage });
        setMobileView('chat');
    };

    const handleSelectNewUser = (newUser) => {
        // Check if conversation already exists
        const existing = conversations.find(c => {
            const cId = c.user?._id || c.user?.id;
            const nId = newUser._id || newUser.id;
            return cId === nId;
        });
        if (existing) {
            handleSelectConversation(existing);
        } else {
            setSelectedChat({ user: newUser, lastMessage: null });
            setMessages([]);
            setMobileView('chat');
        }
        setShowNewChat(false);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat || sendingMsg) return;

        const receiverId = selectedChat.user?._id || selectedChat.user?.id;
        if (!receiverId) return;

        const tempMsg = {
            _id: Date.now().toString(),
            sender: userId,
            receiver: receiverId,
            content: newMessage.trim(),
            createdAt: new Date().toISOString(),
            pending: true,
        };

        setMessages(prev => [...prev, tempMsg]);
        setNewMessage('');
        setSendingMsg(true);

        try {
            const res = await messageService.sendMessage({ receiverId, content: tempMsg.content });
            setMessages(prev => prev.map(m => m._id === tempMsg._id ? res.data.data : m));
            fetchConversations();
        } catch {
            setMessages(prev => prev.filter(m => m._id !== tempMsg._id));
            setNewMessage(tempMsg.content);
        } finally {
            setSendingMsg(false);
        }
    };

    const filteredConversations = conversations.filter(c =>
        search === '' ||
        `${c.user?.firstName} ${c.user?.lastName}`.toLowerCase().includes(search.toLowerCase())
    );

    const filteredAvailable = availableUsers.filter(u =>
        search === '' ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase())
    );

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = new Date();
        const diffH = (now - d) / 3600000;
        if (diffH < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const chatUser = selectedChat?.user;
    const chatUserId = chatUser?._id || chatUser?.id;

    return (
        <div className="h-[calc(100vh-80px)] flex gap-0 rounded-2xl overflow-hidden border border-white/5">
            {/* Sidebar / Conversation List */}
            <AnimatePresence initial={false}>
                {(mobileView === 'list' || window.innerWidth >= 1024) && (
                    <motion.div
                        key="sidebar"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        className={cn(
                            'w-full lg:w-80 flex-shrink-0 flex flex-col border-r border-white/5',
                            'bg-[#0a0a16]',
                            mobileView === 'chat' ? 'hidden lg:flex' : 'flex'
                        )}
                    >
                        {/* Header */}
                        <div className="px-4 py-4 border-b border-white/5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-black text-white">Messages</h2>
                                <button
                                    onClick={() => { setShowNewChat(true); fetchAvailableUsers(); }}
                                    className={cn('p-2 rounded-xl transition-all', myTheme.text, 'hover:bg-white/5')}
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2">
                                <Search className="w-4 h-4 text-white/30" />
                                <input
                                    type="text"
                                    placeholder="Search messages..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm text-white/70 placeholder-white/25 flex-1"
                                />
                            </div>
                        </div>

                        {/* Conversation List */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="space-y-2 p-3">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="flex gap-3 p-3">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-3 bg-white/5 rounded animate-pulse w-3/4" />
                                                <div className="h-2 bg-white/5 rounded animate-pulse w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredConversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                                    <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center', myTheme.bg, 'opacity-20')}>
                                        <MessageSquare className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-white/50">No conversations yet</p>
                                        <p className="text-xs text-white/25 mt-1">Start a new chat below</p>
                                    </div>
                                    <button
                                        onClick={() => setShowNewChat(true)}
                                        className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all', myTheme.bg, 'hover:opacity-80')}
                                    >
                                        <Plus className="w-4 h-4" /> New Chat
                                    </button>
                                </div>
                            ) : (
                                <div className="p-2 space-y-0.5">
                                    {filteredConversations.map((conv, i) => {
                                        const convUserId = conv.user?._id || conv.user?.id;
                                        const isSelected = chatUserId === convUserId;
                                        const unread = conv.lastMessage && !conv.lastMessage.read &&
                                            (conv.lastMessage.receiver === userId || conv.lastMessage.receiver?._id === userId);

                                        return (
                                            <motion.div
                                                key={convUserId || i}
                                                initial={{ opacity: 0, x: -15 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                onClick={() => handleSelectConversation(conv)}
                                                className={cn(
                                                    'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all',
                                                    isSelected ? cn('border', myTheme.border, 'bg-white/5') : 'hover:bg-white/5'
                                                )}
                                            >
                                                <div className="relative">
                                                    <Avatar name={`${conv.user?.firstName} ${conv.user?.lastName}`} role={conv.user?.role} size="md" />
                                                    {unread && (
                                                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-[#0a0a16]" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <p className={cn('text-sm font-bold truncate', unread ? 'text-white' : 'text-white/70')}>
                                                            {conv.user?.firstName} {conv.user?.lastName}
                                                        </p>
                                                        <span className="text-[10px] text-white/25 flex-shrink-0 ml-1">
                                                            {formatTime(conv.lastMessage?.createdAt)}
                                                        </span>
                                                    </div>
                                                    <p className={cn('text-xs truncate mt-0.5', unread ? 'text-white/60 font-medium' : 'text-white/30')}>
                                                        {conv.lastMessage?.content || 'Start a conversation'}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <div className={cn(
                'flex-1 flex flex-col bg-[#070712]',
                mobileView === 'list' ? 'hidden lg:flex' : 'flex'
            )}>
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#0a0a16]/80 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setMobileView('list')}
                                    className="lg:hidden p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 mr-1"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <Avatar
                                    name={`${chatUser?.firstName} ${chatUser?.lastName}`}
                                    role={chatUser?.role}
                                    size="md"
                                />
                                <div>
                                    <p className="text-sm font-black text-white">{chatUser?.firstName} {chatUser?.lastName}</p>
                                    <p className={cn('text-[10px] font-bold uppercase tracking-wider', myTheme.text)}>
                                        {chatUser?.role}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button className="p-2 text-white/30 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                                    <Phone className="w-4 h-4" />
                                </button>
                                <button className="p-2 text-white/30 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                                    <Video className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                    <Avatar name={`${chatUser?.firstName} ${chatUser?.lastName}`} role={chatUser?.role} size="lg" />
                                    <p className="text-white/40 font-medium text-sm">Start a conversation with {chatUser?.firstName}</p>
                                </div>
                            ) : (
                                messages.map((msg, i) => {
                                    const isOwn = (msg.sender === userId) || (msg.sender?._id === userId) || (msg.sender?.id === userId);
                                    const showAvatar = !isOwn && (i === 0 || (messages[i - 1]?.sender !== msg.sender && messages[i - 1]?.sender?._id !== (msg.sender?._id || msg.sender)));

                                    return (
                                        <motion.div
                                            key={msg._id || i}
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ duration: 0.2 }}
                                            className={cn('flex items-end gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}
                                        >
                                            {!isOwn && (
                                                <div className={cn('w-6 h-6', showAvatar ? 'opacity-100' : 'opacity-0')}>
                                                    <Avatar name={`${chatUser?.firstName}`} role={chatUser?.role} size="sm" />
                                                </div>
                                            )}
                                            <div className={cn('max-w-[70%] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
                                                <div className={cn(
                                                    'px-3.5 py-2.5 rounded-2xl text-sm font-medium shadow-lg',
                                                    isOwn
                                                        ? cn('text-white bg-gradient-to-br', myTheme.bubble, 'rounded-br-md')
                                                        : 'bg-white/8 text-white/85 backdrop-blur-sm rounded-bl-md border border-white/5'
                                                )}>
                                                    {msg.content}
                                                </div>
                                                <div className="flex items-center gap-1 mt-1 px-1">
                                                    <span className="text-[10px] text-white/20">{formatTime(msg.createdAt)}</span>
                                                    {isOwn && (
                                                        msg.pending
                                                            ? <Check className="w-3 h-3 text-white/20" />
                                                            : <CheckCheck className="w-3 h-3 text-white/40" />
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <form
                            onSubmit={handleSend}
                            className="px-4 py-4 border-t border-white/5 bg-[#0a0a16]/80 backdrop-blur-sm"
                        >
                            <div className={cn(
                                'flex items-center gap-3 bg-white/5 border border-white/8 rounded-2xl px-4 py-2',
                                'focus-within:border-white/20 transition-all'
                            )}>
                                <button type="button" className="text-white/30 hover:text-white/60 transition-colors">
                                    <Smile className="w-5 h-5" />
                                </button>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-transparent border-none outline-none text-sm text-white/80 placeholder-white/25"
                                />
                                <motion.button
                                    type="submit"
                                    disabled={!newMessage.trim() || sendingMsg}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={cn(
                                        'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
                                        newMessage.trim()
                                            ? cn('bg-gradient-to-br text-white', myTheme.bubble)
                                            : 'bg-white/5 text-white/20 cursor-not-allowed'
                                    )}
                                >
                                    <Send className="w-4 h-4" />
                                </motion.button>
                            </div>
                        </form>
                    </>
                ) : (
                    /* Empty State */
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            className={cn('w-20 h-20 rounded-3xl flex items-center justify-center', myTheme.bg, 'opacity-20')}
                        >
                            <MessageSquare className="w-10 h-10 text-white" />
                        </motion.div>
                        <div className="text-center">
                            <p className="text-lg font-black text-white/40">Select a Conversation</p>
                            <p className="text-sm text-white/20 mt-1">or start a new one</p>
                        </div>
                        <button
                            onClick={() => { setShowNewChat(true); fetchAvailableUsers(); }}
                            className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white', 'bg-gradient-to-r', myTheme.bubble)}
                        >
                            <Plus className="w-4 h-4" /> New Message
                        </button>
                    </div>
                )}
            </div>

            {/* New Chat Modal */}
            <AnimatePresence>
                {showNewChat && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowNewChat(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-sm bg-[#0e0e1c] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                        >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                                <p className="font-black text-white">New Conversation</p>
                                <button onClick={() => setShowNewChat(false)} className="text-white/30 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-3">
                                <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2 mb-3">
                                    <Search className="w-4 h-4 text-white/30" />
                                    <input
                                        type="text"
                                        placeholder="Search people..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        autoFocus
                                        className="bg-transparent border-none outline-none text-sm text-white/70 placeholder-white/25 flex-1"
                                    />
                                </div>
                                <div className="space-y-1 max-h-64 overflow-y-auto">
                                    {filteredAvailable.length === 0 ? (
                                        <p className="text-center text-white/30 text-sm py-6">No users available</p>
                                    ) : filteredAvailable.map((u) => (
                                        <button
                                            key={u._id || u.id}
                                            onClick={() => handleSelectNewUser(u)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all text-left"
                                        >
                                            <Avatar name={`${u.firstName} ${u.lastName}`} role={u.role} size="sm" />
                                            <div>
                                                <p className="text-sm font-bold text-white/80">{u.firstName} {u.lastName}</p>
                                                <p className={cn('text-[10px] font-bold uppercase tracking-wider', ROLE_COLORS[u.role]?.text || 'text-white/30')}>{u.role}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
