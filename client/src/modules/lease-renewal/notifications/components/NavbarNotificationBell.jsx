import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import useNotifications from '../hooks/useNotifications';
import NotificationDropdownPopover from './NotificationDropdownPopover';
import UnreadBadgeSkeleton from './skeletons/UnreadBadgeSkeleton';

export function NavbarNotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification
    } = useNotifications({ limit: 5 });

    // Handle outside click to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <div className="relative inline-block" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Notifications"
                className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
                <Bell className="w-5 h-5" />
                {loading && unreadCount === 0 ? (
                    <UnreadBadgeSkeleton />
                ) : unreadCount > 0 ? (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-extrabold text-white ring-2 ring-slate-950 shadow-md">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                ) : null}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 z-50">
                    <NotificationDropdownPopover
                        notifications={notifications}
                        unreadCount={unreadCount}
                        loading={loading}
                        onMarkAsRead={markAsRead}
                        onMarkAllAsRead={markAllAsRead}
                        onDelete={deleteNotification}
                        onClose={() => setIsOpen(false)}
                    />
                </div>
            )}
        </div>
    );
}

export default NavbarNotificationBell;
