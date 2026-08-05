import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, BellOff, ArrowRight } from 'lucide-react';
import NotificationItem from './NotificationItem';
import BellDropdownSkeleton from './skeletons/BellDropdownSkeleton';

export function NotificationDropdownPopover({
    notifications = [],
    unreadCount = 0,
    loading = false,
    onMarkAsRead,
    onMarkAllAsRead,
    onDelete,
    onClose
}) {
    const navigate = useNavigate();

    const handleViewAll = () => {
        if (onClose) onClose();
        navigate('/notifications');
    };

    return (
        <div className="w-80 sm:w-96 bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl dark:backdrop-blur-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-slate-900 dark:text-slate-100 z-50 animate-in fade-in zoom-in-95 duration-150">
            {/* Popover Header */}
            <div className="p-3.5 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
                <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Notifications</span>
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white shadow-sm">
                            {unreadCount} new
                        </span>
                    )}
                </div>

                {unreadCount > 0 && (
                    <button
                        onClick={onMarkAllAsRead}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark all read
                    </button>
                )}
            </div>

            {/* Notifications Content */}
            <div className="max-h-96 overflow-y-auto p-2 space-y-2 divide-y divide-slate-100 dark:divide-slate-800/40">
                {loading ? (
                    <BellDropdownSkeleton count={3} />
                ) : notifications.length === 0 ? (
                    <div className="py-10 text-center px-4">
                        <BellOff className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">No new notifications</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">You're completely caught up!</p>
                    </div>
                ) : (
                    notifications.slice(0, 5).map(item => (
                        <NotificationItem
                            key={item.id}
                            notification={item}
                            onMarkAsRead={onMarkAsRead}
                            onDelete={onDelete}
                        />
                    ))
                )}
            </div>

            {/* Popover Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/80 text-center">
                <button
                    onClick={handleViewAll}
                    className="w-full py-2 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 hover:text-indigo-700 dark:hover:text-white border border-indigo-200 dark:border-indigo-500/30 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                >
                    <span>View All Notifications</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

export default NotificationDropdownPopover;
