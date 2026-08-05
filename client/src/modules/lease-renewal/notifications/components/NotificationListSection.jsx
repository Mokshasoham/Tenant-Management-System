import React from 'react';
import { Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import NotificationItem from './NotificationItem';
import NotificationListSkeleton from './skeletons/NotificationListSkeleton';

export function NotificationListSection({
    notifications,
    loading,
    selectedIds,
    onToggleSelect,
    onMarkAsRead,
    onDelete,
    page,
    limit,
    total,
    hasMore,
    onPageChange
}) {
    if (loading) {
        return <NotificationListSkeleton count={5} />;
    }

    if (!notifications || notifications.length === 0) {
        return (
            <div className="text-center py-16 px-4 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/60">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                    <Inbox className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">No notifications found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                    You're all caught up! There are no matching notifications or alerts in this view.
                </p>
            </div>
        );
    }

    const totalPages = Math.ceil(total / limit) || 1;

    return (
        <div className="space-y-4">
            {/* List */}
            <div className="space-y-3">
                {notifications.map(item => (
                    <NotificationItem
                        key={item.id}
                        notification={item}
                        isSelected={selectedIds.includes(item.id)}
                        onToggleSelect={onToggleSelect}
                        onMarkAsRead={onMarkAsRead}
                        onDelete={onDelete}
                    />
                ))}
            </div>

            {/* Pagination Controls */}
            {total > limit && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                    <div>
                        Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{((page - 1) * limit) + 1}</span> to{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(page * limit, total)}</span> of{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{total}</span> notifications
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => onPageChange(page - 1)}
                            disabled={page <= 1}
                            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-700 dark:text-slate-200">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => onPageChange(page + 1)}
                            disabled={page >= totalPages}
                            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationListSection;
