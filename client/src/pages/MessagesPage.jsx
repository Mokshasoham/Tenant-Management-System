import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { messageService } from '../services/api';
import useAuthStore from '../context/authStore';
import {
    Send, Search, Plus, MessageSquare, ArrowLeft, MoreVertical,
    Check, CheckCheck, Smile, Paperclip, Phone, Video, X, Image as ImageIcon,
    Download, FileText, FileUp, Play, Sparkles
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { cn } from '../utils/cn';

const ROLE_COLORS = {
    admin: { 
        bg: 'bg-gradient-to-tr from-violet-600 to-purple-600', 
        text: 'text-violet-500 dark:text-violet-400', 
        border: 'border-violet-500/20', 
        bubble: 'from-violet-600 to-purple-600',
        lightBg: 'bg-violet-500/10'
    },
    manager: { 
        bg: 'bg-gradient-to-tr from-blue-600 to-indigo-600', 
        text: 'text-blue-500 dark:text-blue-400', 
        border: 'border-blue-500/20', 
        bubble: 'from-blue-600 to-cyan-600',
        lightBg: 'bg-blue-500/10'
    },
    tenant: { 
        bg: 'bg-gradient-to-tr from-emerald-600 to-teal-600', 
        text: 'text-emerald-500 dark:text-emerald-400', 
        border: 'border-emerald-500/20', 
        bubble: 'from-emerald-600 to-teal-600',
        lightBg: 'bg-emerald-500/10'
    },
};

function Avatar({ name, role, size = 'md', isOnline = false }) {
    const colors = ROLE_COLORS[role] || ROLE_COLORS.tenant;
    const sizeClass = { 
        sm: 'w-8 h-8 text-[10px]', 
        md: 'w-11 h-11 text-xs', 
        lg: 'w-14 h-14 text-base' 
    }[size];
    
    const initials = (name || '?')
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
        
    return (
        <div className="relative flex-shrink-0">
            <div className={cn(
                'rounded-2xl flex items-center justify-center font-black text-white shadow-md relative overflow-hidden transition-all duration-300', 
                sizeClass, 
                colors.bg
            )}>
                {/* Subtle sheen highlight */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 rotate-45" />
                <span className="relative z-10 tracking-wider">{initials}</span>
            </div>
            <span className={cn(
                "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card transition-all duration-300",
                isOnline 
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" 
                    : "bg-muted-foreground/30"
            )} />
        </div>
    );
}

export default function MessagesPage() {
    const user = useAuthStore((state) => state.user);
    const { 
        conversations: chatConversations, 
        messages: chatMessages, 
        activeChat, 
        setActiveChat, 
        typingUsers, 
        onlineUsers,
        availableUsers,
        isLoading,
        fetchConversations,
        fetchAvailableUsers,
        fetchMessages: loadChatMessages,
        sendMessage: emitMessage,
        sendTyping,
        markAsRead: emitRead,
        deleteMessage,
        uploadFile
    } = useChat();

    const [newMessage, setNewMessage] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);
    const [showNewChat, setShowNewChat] = useState(false);
    const [search, setSearch] = useState('');
    const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'
    const [attachments, setAttachments] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const [msgSearchQuery, setMsgSearchQuery] = useState('');
    const [showMsgSearch, setShowMsgSearch] = useState(false);
    
    const location = useLocation();

    const role = user?.role;
    const myTheme = ROLE_COLORS[role] || ROLE_COLORS.tenant;
    const userId = user?._id || user?.id;

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const serverUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

    const getFullUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
        const cleanServerUrl = serverUrl.replace(/\/$/, '');
        const cleanUrl = url.startsWith('/') ? url : '/' + url;
        return `${cleanServerUrl}${cleanUrl}`;
    };

    /**
     * Fetches a secure signed URL from /api/files/signed-url/:fileId.
     * Falls back to getFullUrl(att.url) for legacy attachments without a fileId.
     */
    const fetchSignedUrl = async (att) => {
        if (!att.fileId) return getFullUrl(att.url);
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${apiBase}/files/signed-url/${att.fileId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to get signed URL');
            const data = await res.json();
            if (data.success && data.url) {
                const url = data.url;
                const cleanServerUrl = serverUrl.replace(/\/$/, '');
                const cleanUrl = url.startsWith('/') ? url : '/' + url;
                return url.startsWith('http') ? url : `${cleanServerUrl}${cleanUrl}`;
            }
        } catch (err) {
            console.error('[fetchSignedUrl] Error:', err);
        }
        return getFullUrl(att.url); // graceful fallback
    };

    const openAttachment = async (att) => {
        const url = await fetchSignedUrl(att);
        if (url) window.open(url, '_blank');
    };



    const EMOJIS = [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
        '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
        '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸',
        '👍', '👎', '👌', '🤌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈',
        '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖',
        '✍️', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💅', '🤳', '❤️',
        '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '🏠',
        '🔑', '🚪', '🛋️', '📦', '💰', '📄', '📎', '📅', '💬'
    ];

    useEffect(() => {
        if (!user) return;
        fetchConversations();
        fetchAvailableUsers();
        
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
    }, [location.state, fetchAvailableUsers, fetchConversations, user]);

    useEffect(() => {
        if (!user || !activeChat) return;
        const otherId = activeChat.user?._id || activeChat.user?.id || activeChat._id || activeChat.id;
        loadChatMessages(otherId);
    }, [activeChat, loadChatMessages, user]);

    useEffect(() => {
        if (!user || !activeChat || !chatMessages.length) return;
        const otherId = activeChat.user?._id || activeChat.user?.id || activeChat._id || activeChat.id;
        
        // Mark unread messages as read
        const unreadIds = chatMessages
            .filter(m => (m.receiver === userId || m.receiver?._id === userId) && !m.read)
            .map(m => m._id);
        if (unreadIds.length > 0) emitRead(otherId, unreadIds);
    }, [chatMessages, activeChat, userId, emitRead, user]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages]);

    if (!user) return null;

    const handleSelectConversation = (conv) => {
        setActiveChat(conv);
        setMobileView('chat');
    };

    const handleSelectNewUser = (newUser) => {
        const existing = chatConversations.find(c => {
            const cId = c.user?._id || c.user?.id;
            const nId = newUser._id || newUser.id;
            return cId === nId;
        });
        if (existing) {
            handleSelectConversation(existing);
        } else {
            setActiveChat({ user: newUser, _id: newUser._id });
            setMobileView('chat');
        }
        setShowNewChat(false);
    };

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if ((!newMessage.trim() && attachments.length === 0) || !activeChat || sendingMsg) return;

        const receiverId = activeChat.user?._id || activeChat.user?.id || activeChat._id;
        if (!receiverId) return;

        setSendingMsg(true);
        try {
            await emitMessage(receiverId, newMessage.trim(), attachments);
            setNewMessage('');
            setAttachments([]);
            setShowEmojiPicker(false);
            sendTyping(receiverId, false);
        } catch (err) {
            console.error('Send error', err);
        } finally {
            setSendingMsg(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const tempId = Date.now();
        setAttachments(prev => [...prev, { _tempId: tempId, fileName: file.name, fileType: file.type, url: URL.createObjectURL(file), uploading: true }]);

        try {
            const uploaded = await uploadFile(file);
            setAttachments(prev => prev.map(a => a._tempId === tempId ? { ...uploaded, uploading: false } : a));
        } catch (err) {
            setAttachments(prev => prev.filter(a => a._tempId !== tempId));
            alert('File upload failed');
        } finally {
            e.target.value = '';
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only trigger leave if we actually drag out of container, not on child hover
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDragging(false);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        const file = files[0];
        const tempId = Date.now();
        setAttachments(prev => [...prev, { _tempId: tempId, fileName: file.name, fileType: file.type, url: URL.createObjectURL(file), uploading: true }]);

        try {
            const uploaded = await uploadFile(file);
            setAttachments(prev => prev.map(a => a._tempId === tempId ? { ...uploaded, uploading: false } : a));
        } catch (err) {
            setAttachments(prev => prev.filter(a => a._tempId !== tempId));
            alert('File upload failed');
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (!window.confirm('Delete this message?')) return;
        const receiverId = activeChat.user?._id || activeChat.user?.id || activeChat._id;
        try {
            deleteMessage(messageId, receiverId);
        } catch (err) {
            console.error('Delete error', err);
        }
    };

    const onTyping = (e) => {
        setNewMessage(e.target.value);
        const receiverId = activeChat.user?._id || activeChat.user?.id || activeChat._id;
        if (receiverId) {
            sendTyping(receiverId, e.target.value.length > 0);
        }
    };

    const filteredConversations = (chatConversations || []).filter(c =>
        search === '' ||
        `${c.user?.firstName} ${c.user?.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        c.lastMessage?.content?.toLowerCase().includes(search.toLowerCase())
    );

    const filteredAvailable = (availableUsers || []).filter(u =>
        search === '' ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = new Date();
        const diffH = (now - d) / 3600000;
        if (diffH < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const chatUser = activeChat?.user;
    const chatUserId = chatUser?._id || chatUser?.id || activeChat?._id;
    const isChatUserOnline = onlineUsers[chatUserId];
    const isOtherTyping = typingUsers[chatUserId];

    return (
        <div className="h-[calc(100vh-80px)] flex rounded-3xl overflow-hidden border border-border bg-card/20 backdrop-blur-xl shadow-2xl transition-all duration-300">
            {/* Sidebar / Conversation List */}
            <AnimatePresence initial={false}>
                {(mobileView === 'list' || window.innerWidth >= 1024) && (
                    <motion.div
                        key="sidebar"
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -30, opacity: 0 }}
                        className={cn(
                            'w-full lg:w-80 flex-shrink-0 flex flex-col border-r border-border transition-all duration-300 bg-card/40 backdrop-blur-md',
                            mobileView === 'chat' ? 'hidden lg:flex' : 'flex'
                        )}
                    >
                        {/* Header */}
                        <div className="px-5 py-5 border-b border-border/60">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-6 rounded-full bg-emerald-500" />
                                    <h2 className="text-xl font-black text-foreground tracking-tight">Chats</h2>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => { setShowNewChat(true); fetchAvailableUsers(); }}
                                    className={cn('p-2.5 rounded-xl transition-all flex items-center justify-center border shadow-lg shadow-emerald-500/5', myTheme.text, myTheme.lightBg, 'border-emerald-500/10 hover:bg-emerald-500/20')}
                                >
                                    <Plus className="w-4 h-4" />
                                </motion.button>
                            </div>
                            <div className="flex items-center gap-2.5 bg-muted/40 border border-border/80 rounded-2xl px-4 py-2.5 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/20">
                                <Search className="w-4 h-4 text-muted-foreground/30" />
                                <input
                                    type="text"
                                    placeholder="Search conversations..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground/45 flex-1 font-medium"
                                />
                            </div>
                        </div>

                        {/* Conversation List */}
                        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                            {isLoading ? (
                                <div className="space-y-3 p-4">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="flex gap-3 p-3.5 rounded-2xl bg-muted/10 border border-border/10">
                                            <div className="w-11 h-11 rounded-2xl bg-muted/20 animate-pulse" />
                                            <div className="flex-1 space-y-2.5 py-0.5">
                                                <div className="h-3.5 bg-muted/20 rounded animate-pulse w-3/4" />
                                                <div className="h-2.5 bg-muted/20 rounded animate-pulse w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredConversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                                    <div className={cn('w-16 h-16 rounded-3xl flex items-center justify-center border', myTheme.lightBg, 'border-emerald-500/10')}>
                                        <MessageSquare className="w-7 h-7 text-emerald-500/60" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-black text-sm text-foreground/75">No chats yet</p>
                                        <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-black">Search users to start a chat</p>
                                    </div>
                                    <motion.button
                                        whileHover={{ y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setShowNewChat(true)}
                                        className={cn('flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-[10px] font-black text-white transition-all uppercase tracking-wider shadow-md bg-gradient-to-r', myTheme.bubble)}
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Start Conversation
                                    </motion.button>
                                </div>
                            ) : (
                                <div className="p-3 space-y-1">
                                    {filteredConversations.map((conv, i) => {
                                        const convUserId = conv.user?._id || conv.user?.id;
                                        const isSelected = chatUserId === convUserId;
                                        const unread = conv.lastMessage && !conv.lastMessage.read &&
                                            (conv.lastMessage.receiver === userId || conv.lastMessage.receiver?._id === userId);

                                        return (
                                            <motion.div
                                                key={convUserId || i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                onClick={() => handleSelectConversation(conv)}
                                                className={cn(
                                                    'flex items-center gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all duration-300 border border-transparent',
                                                    isSelected 
                                                        ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/10 shadow-sm' 
                                                        : 'hover:bg-muted/20 hover:border-border/30'
                                                )}
                                            >
                                                <Avatar 
                                                    name={`${conv.user?.firstName} ${conv.user?.lastName}`} 
                                                    role={conv.user?.role} 
                                                    size="md" 
                                                    isOnline={onlineUsers[convUserId]}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <p className={cn('text-sm font-black truncate transition-colors', isSelected ? 'text-primary' : 'text-foreground')}>
                                                            {conv.user?.firstName} {conv.user?.lastName}
                                                        </p>
                                                        <span className="text-[9px] text-muted-foreground/40 flex-shrink-0 ml-1 font-bold">
                                                            {formatTime(conv.lastMessage?.createdAt)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <p className={cn('text-[11px] truncate flex-1 pr-2', unread ? 'text-foreground font-black' : 'text-muted-foreground/50')}>
                                                            {conv.lastMessage?.content || 'Start a conversation'}
                                                        </p>
                                                        {unread && (
                                                            <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 animate-pulse" />
                                                        )}
                                                    </div>
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
            <div 
                className={cn(
                    'flex-1 flex flex-col bg-background/20 relative transition-all duration-300',
                    mobileView === 'list' ? 'hidden lg:flex' : 'flex'
                )}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Drag-and-drop overlay */}
                <AnimatePresence>
                    {isDragging && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-card/65 backdrop-blur-md z-30 flex items-center justify-center p-6 transition-all border-4 border-dashed border-emerald-500/30 m-4 rounded-3xl"
                        >
                            <div className="flex flex-col items-center gap-3 text-center pointer-events-none">
                                <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-500 shadow-xl shadow-emerald-500/5 animate-bounce">
                                    <FileUp className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-black text-foreground">Drop File to Attach</h3>
                                <p className="text-xs text-muted-foreground/60">Attach images, videos, PDFs, or documents directly to this chat.</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {activeChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="flex items-center justify-between px-6 py-4.5 border-b border-border/80 bg-card/30 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-3.5">
                                <button
                                    onClick={() => setMobileView('list')}
                                    className="lg:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors mr-1"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <Avatar
                                    name={`${chatUser?.firstName} ${chatUser?.lastName}`}
                                    role={chatUser?.role}
                                    size="md"
                                    isOnline={isChatUserOnline}
                                />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-black text-foreground">{chatUser?.firstName} {chatUser?.lastName}</p>
                                    </div>
                                    <p className={cn('text-[9px] font-black uppercase tracking-widest mt-0.5')}>
                                        {isOtherTyping ? (
                                            <span className="flex items-center gap-1 text-emerald-500">
                                                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }}>.</motion.span>
                                                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}>.</motion.span>
                                                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}>.</motion.span>
                                                typing
                                            </span>
                                        ) : (
                                            <span className={isChatUserOnline ? 'text-emerald-500' : 'text-muted-foreground/40'}>
                                                {isChatUserOnline ? 'Online' : 'Offline'}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => setShowMsgSearch(!showMsgSearch)}
                                    className={cn('p-2.5 rounded-xl transition-all border border-transparent', showMsgSearch ? 'bg-primary/10 text-primary border-primary/10' : 'text-muted-foreground/30 hover:text-foreground hover:bg-muted/20')}
                                    title="Search Messages"
                                >
                                    <Search className="w-4 h-4" />
                                </button>
                                <button className="p-2.5 text-muted-foreground/30 hover:text-foreground hover:bg-muted/20 rounded-xl transition-all border border-transparent" title="Voice Call">
                                    <Phone className="w-4 h-4" />
                                </button>
                                <button className="p-2.5 text-muted-foreground/30 hover:text-foreground hover:bg-muted/20 rounded-xl transition-all border border-transparent" title="Video Call">
                                    <Video className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {showMsgSearch && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="px-5 py-2.5 bg-muted/15 border-b border-border/80 flex items-center gap-2.5"
                            >
                                <Search className="w-3.5 h-3.5 text-muted-foreground/40" />
                                <input 
                                    type="text" 
                                    placeholder="Find in chat..."
                                    value={msgSearchQuery}
                                    onChange={e => setMsgSearchQuery(e.target.value)}
                                    className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground/35 flex-1 font-medium"
                                    autoFocus
                                />
                                {msgSearchQuery && (
                                    <button onClick={() => setMsgSearchQuery('')}>
                                        <X className="w-3 h-3 text-muted-foreground/40 hover:text-foreground transition-colors" />
                                    </button>
                                )}
                            </motion.div>
                        )}

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                            {chatMessages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30 select-none">
                                    <div className={cn('w-16 h-16 rounded-[1.5rem] flex items-center justify-center border border-border bg-muted/10')}>
                                        <Sparkles className="w-7 h-7 text-foreground" />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="text-foreground font-black text-sm uppercase tracking-wider">Start a Conversation</p>
                                        <p className="text-[10px] text-muted-foreground font-medium max-w-xs mx-auto">Send your first message or media files to begin communication.</p>
                                    </div>
                                </div>
                            ) : (
                                chatMessages
                                    .filter(m => !msgSearchQuery || m.content.toLowerCase().includes(msgSearchQuery.toLowerCase()))
                                    .map((msg, i) => {
                                    const isOwn = (msg.sender === userId) || (msg.sender?._id === userId) || (msg.sender?.id === userId);
                                    const showAvatar = !isOwn && (i === 0 || (chatMessages[i - 1]?.sender !== msg.sender && chatMessages[i - 1]?.sender?._id !== (msg.sender?._id || msg.sender)));

                                    return (
                                        <motion.div
                                            key={msg._id || i}
                                            initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ duration: 0.25, ease: 'easeOut' }}
                                            className={cn('flex items-end gap-3', isOwn ? 'flex-row-reverse' : 'flex-row')}
                                        >
                                            {!isOwn && (
                                                <div className={cn('w-8 h-8 flex-shrink-0 transition-opacity', showAvatar ? 'opacity-100' : 'opacity-0')}>
                                                    {showAvatar && (
                                                        <Avatar name={`${chatUser?.firstName}`} role={chatUser?.role} size="sm" />
                                                    )}
                                                </div>
                                            )}
                                            <div className={cn('max-w-[70%] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
                                                <div className={cn(
                                                    'px-4 py-3 rounded-2xl text-sm font-semibold shadow-md relative group/bubble',
                                                    isOwn
                                                        ? cn('text-white bg-gradient-to-br', myTheme.bubble, 'rounded-br-[4px]')
                                                        : 'bg-card/75 border border-border/80 text-foreground rounded-bl-[4px]'
                                                )}>
                                                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                    {msg.attachments?.length > 0 && (
                                                         <div className="mt-3.5 space-y-2.5 max-w-sm">
                                                             {msg.attachments.map((att, idx) => {
                                                                 const fullUrl = getFullUrl(att.url);
                                                                 const isImage = att.fileType?.startsWith('image/');
                                                                 const isVideo = att.fileType?.startsWith('video/');
                                                                 const isAudio = att.fileType?.startsWith('audio/');

                                                                 return (
                                                                     <div key={idx} className="rounded-xl overflow-hidden border border-white/10 shadow-sm bg-black/10 transition-transform duration-300 hover:scale-[1.01]">
                                                                         {isImage ? (
                                                                             <div className="relative group/att">
                                                                                 <img 
                                                                                     src={fullUrl} 
                                                                                     alt={att.fileName} 
                                                                                     className="max-w-full h-auto max-h-60 object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity" 
                                                                                     onClick={() => openAttachment(att)} 
                                                                                 />
                                                                                 <button
                                                                                     type="button"
                                                                                     onClick={() => openAttachment(att)}
                                                                                     className="absolute bottom-2 right-2 p-2 rounded-lg bg-black/60 text-white opacity-0 group-hover/att:opacity-100 transition-opacity"
                                                                                     title="Download image"
                                                                                 >
                                                                                     <Download className="w-3.5 h-3.5" />
                                                                                 </button>
                                                                             </div>
                                                                         ) : isVideo ? (
                                                                             <video 
                                                                                 src={fullUrl} 
                                                                                 controls 
                                                                                 className="max-w-full h-auto max-h-60 rounded-lg" 
                                                                             />
                                                                         ) : isAudio ? (
                                                                             <audio 
                                                                                 src={fullUrl} 
                                                                                 controls 
                                                                                 className="max-w-full p-1" 
                                                                             />
                                                                         ) : (
                                                                             <div className="p-3.5 flex items-center justify-between gap-4 min-w-[220px]">
                                                                                 <div className="flex items-center gap-3 min-w-0">
                                                                                     <div className="p-2.5 rounded-xl bg-white/10 text-white flex-shrink-0">
                                                                                         <FileText className="w-4 h-4" />
                                                                                     </div>
                                                                                     <div className="min-w-0">
                                                                                         <p className="text-xs font-black truncate text-white leading-none">{att.fileName}</p>
                                                                                         <p className="text-[8px] text-white/50 uppercase tracking-widest font-black mt-1">{(att.fileType || 'file').split('/')[1] || 'document'}</p>
                                                                                     </div>
                                                                                 </div>
                                                                                 <button
                                                                                     type="button"
                                                                                     onClick={() => openAttachment(att)}
                                                                                     className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all flex-shrink-0 shadow-inner"
                                                                                     title="Open file"
                                                                                 >
                                                                                     <Download className="w-3.5 h-3.5" />
                                                                                 </button>
                                                                             </div>
                                                                         )}
                                                                     </div>
                                                                 );
                                                             })}
                                                         </div>
                                                     )}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1.5 px-1.5">
                                                    <span className="text-[8px] text-muted-foreground/35 font-bold uppercase tracking-wider">{formatTime(msg.createdAt)}</span>
                                                    {isOwn && (
                                                        <div className="flex items-center gap-1.5">
                                                            {msg.pending
                                                                ? <Check className="w-3 h-3 text-muted-foreground/20" />
                                                                : (msg.read ? <CheckCheck className="w-3 h-3 text-sky-500" /> : <CheckCheck className="w-3 h-3 text-muted-foreground/45" />)}
                                                            <button 
                                                                onClick={() => handleDeleteMessage(msg._id)}
                                                                className="text-muted-foreground/25 hover:text-rose-500 transition-colors ml-1"
                                                                title="Delete Message"
                                                            >
                                                                <X className="w-2.5 h-2.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Attachment Previews Area */}
                        {attachments.length > 0 && (
                            <div className="px-5 py-3.5 flex gap-2.5 overflow-x-auto bg-card/20 backdrop-blur border-t border-border/40 max-h-24">
                                {attachments.map((att, idx) => (
                                    <div key={idx} className="relative group flex-shrink-0">
                                        {att.fileType?.startsWith('image/') ? (
                                            <div className="relative rounded-xl overflow-hidden border border-border shadow-md">
                                                <img src={getFullUrl(att.url)} alt="preview" className="w-14 h-14 object-cover" />
                                                {att.uploading && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                        <div className="w-4 h-4 border-2 border-emerald-500/25 border-t-emerald-500 rounded-full animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-14 h-14 rounded-xl bg-muted/60 flex flex-col items-center justify-center border border-border/80 shadow-md relative">
                                                <Paperclip className="w-5 h-5 opacity-40" />
                                                <span className="text-[8px] font-black tracking-widest text-muted-foreground/60 mt-1 uppercase max-w-[45px] truncate px-1">{(att.fileName || '').split('.').pop()}</span>
                                                {att.uploading && (
                                                    <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                                                        <div className="w-4 h-4 border-2 border-emerald-500/25 border-t-emerald-500 rounded-full animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                            className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-1 shadow-md hover:bg-rose-600 transition-colors"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Message Input Form */}
                        <form
                            onSubmit={handleSend}
                            className="px-5 py-4 border-t border-border/60 bg-card/25 backdrop-blur-lg flex items-center gap-3"
                        >
                            <div className={cn(
                                'flex-1 flex items-center gap-3 bg-muted/50 border border-border/80 rounded-2xl px-4.5 py-3 relative',
                                'focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-300'
                            )}>
                                <div className="relative">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className={cn("p-1.5 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-muted/30 transition-colors flex items-center justify-center", showEmojiPicker && "text-primary bg-primary/10")}
                                    >
                                        <Smile className="w-5 h-5" />
                                    </button>
                                    
                                    <AnimatePresence>
                                        {showEmojiPicker && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                                                className="absolute bottom-14 left-0 z-50 w-72 bg-card border border-border/80 rounded-2xl shadow-2xl p-3 flex flex-col gap-2 backdrop-blur-xl"
                                            >
                                                <div className="flex justify-between items-center pb-2 border-b border-border">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Pick Emoji</span>
                                                    <button type="button" onClick={() => setShowEmojiPicker(false)} className="text-muted-foreground/45 hover:text-foreground">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-8 gap-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border">
                                                    {EMOJIS.map((emoji, idx) => (
                                                        <button 
                                                            key={idx} 
                                                            type="button" 
                                                            onClick={() => {
                                                                setNewMessage(prev => prev + emoji);
                                                            }}
                                                            className="text-lg hover:bg-muted/40 p-1 rounded-lg transition-colors text-center"
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={onTyping}
                                    placeholder="Type a message or drag/drop files..."
                                    className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/35 font-bold"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-muted/30 transition-colors flex items-center justify-center"
                                    title="Attach File"
                                >
                                    <Paperclip className="w-5 h-5" />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>

                            {/* Premium Floating Send Button */}
                            <motion.button
                                type="submit"
                                disabled={(!newMessage.trim() && attachments.length === 0) || sendingMsg}
                                whileHover={{ scale: 1.08, y: -2 }}
                                whileTap={{ scale: 0.92 }}
                                className={cn(
                                    'w-12 h-12 rounded-full flex items-center justify-center transition-all relative overflow-hidden flex-shrink-0 shadow-lg border',
                                    (newMessage.trim() || attachments.length > 0)
                                        ? cn('bg-gradient-to-tr text-white shadow-emerald-500/30 border-emerald-500/20', myTheme.bubble)
                                        : 'bg-muted text-muted-foreground/20 cursor-not-allowed border-border/80 shadow-none'
                                )}
                            >
                                {/* Glowing light layer when user types */}
                                {(newMessage.trim() || attachments.length > 0) && (
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 rotate-45 pointer-events-none animate-pulse" />
                                )}
                                <Send className={cn(
                                    "w-5 h-5 transition-transform duration-300", 
                                    (newMessage.trim() || attachments.length > 0) ? "translate-x-0.5 -translate-y-0.5 text-white filter drop-shadow-[0_2px_4px_rgba(255,255,255,0.2)]" : "text-muted-foreground/25"
                                )} />
                            </motion.button>
                        </form>
                    </>
                ) : (
                    /* Empty State REDESIGNED */
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-background/20 backdrop-blur-sm select-none">
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                            className={cn('w-24 h-24 rounded-[2.2rem] flex items-center justify-center shadow-2xl border relative overflow-hidden', myTheme.lightBg, 'border-emerald-500/10')}
                        >
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 rotate-45" />
                            <MessageSquare className="w-9 h-9 text-emerald-500/60" />
                        </motion.div>
                        <div className="text-center space-y-2 max-w-sm">
                            <h3 className="text-lg font-black text-foreground">Select a Conversation</h3>
                            <p className="text-xs text-muted-foreground/45 font-bold uppercase tracking-widest leading-relaxed">Choose an existing chat from the sidebar or click below to start a new chat with property managers.</p>
                        </div>
                        <button
                            onClick={() => { setShowNewChat(true); fetchAvailableUsers(); }}
                            className={cn('flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs text-white uppercase tracking-widest shadow-xl shadow-emerald-500/10 transition-all border border-emerald-500/10 bg-gradient-to-r', myTheme.bubble, 'hover:scale-[1.02]')}
                        >
                            <Plus className="w-4 h-4" /> Start New Chat
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
                            className="w-full max-w-sm bg-card border border-border/80 rounded-[2.2rem] overflow-hidden shadow-2xl transition-all backdrop-blur-xl"
                        >
                            <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
                                <p className="font-black text-foreground uppercase tracking-widest text-xs">Start Conversation</p>
                                <button onClick={() => setShowNewChat(false)} className="text-muted-foreground/45 hover:text-foreground p-1 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4.5">
                                <div className="flex items-center gap-2.5 bg-muted/40 border border-border rounded-2xl px-4 py-2.5 mb-4">
                                    <Search className="w-4 h-4 text-muted-foreground/35" />
                                    <input
                                        type="text"
                                        placeholder="Search contacts..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        autoFocus
                                        className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground/35 flex-1 font-bold"
                                    />
                                </div>
                                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border">
                                    {filteredAvailable.length === 0 ? (
                                        <div className="text-center py-10 opacity-30 italic text-sm text-foreground">No contacts found</div>
                                    ) : filteredAvailable.map((u) => (
                                        <button
                                            key={u._id || u.id}
                                            onClick={() => handleSelectNewUser(u)}
                                            className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl hover:bg-muted/30 transition-all text-left border border-transparent hover:border-border/40"
                                        >
                                            <Avatar name={`${u.firstName} ${u.lastName}`} role={u.role} size="md" isOnline={onlineUsers[u._id || u.id]} />
                                            <div>
                                                <p className="text-sm font-black text-foreground">{u.firstName} {u.lastName}</p>
                                                <p className={cn('text-[9px] font-black uppercase tracking-widest mt-1', ROLE_COLORS[u.role]?.text || 'text-muted-foreground/40')}>{u.role}</p>
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
