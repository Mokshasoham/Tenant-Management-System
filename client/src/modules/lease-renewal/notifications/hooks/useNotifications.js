import { useState, useEffect, useCallback, useRef } from 'react';
import notificationService from '../services/notificationService';

export function useNotifications(initialParams = {}) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Filters & Pagination
    const [category, setCategory] = useState(initialParams.category || 'all');
    const [unreadOnly, setUnreadOnly] = useState(initialParams.unreadOnly || false);
    const [priorityFilter, setPriorityFilter] = useState(initialParams.priority || 'all');
    const [search, setSearch] = useState(initialParams.search || '');
    const [page, setPage] = useState(initialParams.page || 1);
    const [limit] = useState(initialParams.limit || 20);
    const [cursor, setCursor] = useState(initialParams.cursor || null);

    // Meta & Status
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const isVisibleRef = useRef(typeof document !== 'undefined' ? document.visibilityState === 'visible' : true);

    // Fetch Unread Counter
    const fetchUnreadCount = useCallback(async () => {
        try {
            const count = await notificationService.getUnreadCount();
            setUnreadCount(count);
        } catch (err) {
            console.error('Failed to fetch unread count:', err);
        }
    }, []);

    // Fetch Notifications List
    const fetchNotifications = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setIsRefreshing(true);
        setError(null);

        try {
            const params = {
                page,
                limit,
                ...(category !== 'all' && { category }),
                ...(priorityFilter !== 'all' && { priority: priorityFilter }),
                ...(unreadOnly && { unreadOnly: true }),
                ...(search && { search }),
                ...(cursor && { cursor })
            };

            const res = await notificationService.getNotifications(params);
            if (res.success) {
                setNotifications(res.data || []);
                if (res.pagination) {
                    setTotal(res.pagination.total || 0);
                    setHasMore(Boolean(res.pagination.hasMore));
                    setNextCursor(res.pagination.nextCursor || null);
                }
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
            setError(err.message || 'Failed to load notifications');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [page, limit, category, priorityFilter, unreadOnly, search, cursor]);

    // Initial Load & Param Trigger
    useEffect(() => {
        fetchNotifications();
        fetchUnreadCount();
    }, [fetchNotifications, fetchUnreadCount]);

    // Visibility-Aware Polling (Every 60s when visible)
    useEffect(() => {
        const handleVisibilityChange = () => {
            isVisibleRef.current = document.visibilityState === 'visible';
            if (isVisibleRef.current) {
                // Resume immediately when tab becomes active
                fetchUnreadCount();
                fetchNotifications(true);
            }
        };

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        const intervalId = setInterval(() => {
            if (isVisibleRef.current) {
                fetchUnreadCount();
                fetchNotifications(true);
            }
        }, 60000);

        return () => {
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            }
            clearInterval(intervalId);
        };
    }, [fetchUnreadCount, fetchNotifications]);

    // Optimistic Mutations
    const markAsRead = async (id) => {
        // Optimistically update list & badge count
        setNotifications(prev => prev.map(item => item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item));
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            await notificationService.markAsRead(id);
            fetchUnreadCount(); // Invalidate cache & sync with server
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
            fetchNotifications(true);
            fetchUnreadCount();
        }
    };

    const bulkMarkAsRead = async (idsToRead = selectedIds) => {
        if (!idsToRead || idsToRead.length === 0) return;

        const targetSet = new Set(idsToRead);
        const countToReduce = notifications.filter(n => targetSet.has(n.id) && !n.isRead).length;

        setNotifications(prev => prev.map(item => targetSet.has(item.id) ? { ...item, isRead: true, readAt: new Date().toISOString() } : item));
        setUnreadCount(prev => Math.max(0, prev - countToReduce));
        setSelectedIds(prev => prev.filter(id => !targetSet.has(id)));

        try {
            await notificationService.bulkMarkAsRead(idsToRead);
            fetchUnreadCount();
        } catch (err) {
            console.error('Failed to bulk mark read:', err);
            fetchNotifications(true);
            fetchUnreadCount();
        }
    };

    const markAllAsRead = async () => {
        setNotifications(prev => prev.map(item => ({ ...item, isRead: true, readAt: new Date().toISOString() })));
        setUnreadCount(0);

        try {
            await notificationService.markAllAsRead();
            fetchUnreadCount();
        } catch (err) {
            console.error('Failed to mark all read:', err);
            fetchNotifications(true);
            fetchUnreadCount();
        }
    };

    const deleteNotification = async (id) => {
        const targetNotif = notifications.find(n => n.id === id);
        setNotifications(prev => prev.filter(item => item.id !== id));
        if (targetNotif && !targetNotif.isRead) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));

        try {
            await notificationService.deleteNotification(id);
            fetchUnreadCount();
        } catch (err) {
            console.error('Failed to delete notification:', err);
            fetchNotifications(true);
            fetchUnreadCount();
        }
    };

    const bulkDelete = async (idsToDelete = selectedIds) => {
        if (!idsToDelete || idsToDelete.length === 0) return;

        const targetSet = new Set(idsToDelete);
        const unreadDeletedCount = notifications.filter(n => targetSet.has(n.id) && !n.isRead).length;

        setNotifications(prev => prev.filter(item => !targetSet.has(item.id)));
        setUnreadCount(prev => Math.max(0, prev - unreadDeletedCount));
        setSelectedIds([]);

        try {
            await notificationService.bulkDelete(idsToDelete);
            fetchUnreadCount();
        } catch (err) {
            console.error('Failed to bulk delete notifications:', err);
            fetchNotifications(true);
            fetchUnreadCount();
        }
    };

    const clearAllRead = async () => {
        setNotifications(prev => prev.filter(item => !item.isRead));
        setSelectedIds(prev => prev.filter(id => {
            const notif = notifications.find(n => n.id === id);
            return notif ? !notif.isRead : false;
        }));

        try {
            await notificationService.clearAllRead();
            fetchUnreadCount();
        } catch (err) {
            console.error('Failed to clear read notifications:', err);
            fetchNotifications(true);
            fetchUnreadCount();
        }
    };

    // Selection Handlers
    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === notifications.length && notifications.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(notifications.map(n => n.id));
        }
    };

    const clearSelection = () => setSelectedIds([]);

    return {
        // State
        notifications,
        unreadCount,
        selectedIds,
        category,
        unreadOnly,
        priorityFilter,
        search,
        page,
        limit,
        total,
        hasMore,
        nextCursor,
        loading,
        isRefreshing,
        error,

        // Filters & Pagination Handlers
        setCategory: (cat) => { setCategory(cat); setPage(1); setCursor(null); },
        setUnreadOnly: (bool) => { setUnreadOnly(bool); setPage(1); setCursor(null); },
        setPriorityFilter: (pri) => { setPriorityFilter(pri); setPage(1); setCursor(null); },
        setSearch: (query) => { setSearch(query); setPage(1); setCursor(null); },
        setPage,
        setCursor,

        // Actions
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        bulkMarkAsRead,
        markAllAsRead,
        deleteNotification,
        bulkDelete,
        clearAllRead,
        toggleSelect,
        toggleSelectAll,
        clearSelection
    };
}

export default useNotifications;
