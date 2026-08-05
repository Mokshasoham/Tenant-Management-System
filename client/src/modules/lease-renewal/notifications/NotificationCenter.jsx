import React from 'react';
import { Bell, Settings, CheckCircle2, Trash2, RefreshCw } from 'lucide-react';
import useNotifications from './hooks/useNotifications';
import NotificationFilterBar from './components/NotificationFilterBar';
import NotificationListSection from './components/NotificationListSection';
import NotificationSettingsTab from './components/NotificationSettingsTab';
import { useState } from 'react';

export function NotificationCenter() {
    const [activeTab, setActiveTab] = useState('all');

    const {
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
        loading,
        isRefreshing,
        error,

        setCategory,
        setUnreadOnly,
        setPriorityFilter,
        setSearch,
        setPage,

        fetchNotifications,
        markAsRead,
        bulkMarkAsRead,
        markAllAsRead,
        deleteNotification,
        bulkDelete,
        clearAllRead,
        toggleSelect,
        toggleSelectAll,
        clearSelection
    } = useNotifications({ limit: 15 });

    const isAllSelected = notifications.length > 0 && selectedIds.length === notifications.length;

    return (
        <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 text-slate-900 dark:text-slate-100">
            {/* Header Title Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-50 via-white to-purple-50 dark:from-indigo-900/40 dark:via-slate-900/60 dark:to-purple-900/30 p-6 rounded-3xl border border-indigo-200 dark:border-indigo-500/20 shadow-lg dark:shadow-2xl backdrop-blur-xl">
                <div>
                    <div className="flex items-center space-x-3 mb-1">
                        <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                            <Bell className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Notification Center</h1>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Stay informed on lease renewals, tenant communications, automated payouts, and system alerts.
                    </p>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="inline-flex items-center px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-semibold shadow-lg shadow-indigo-200 dark:shadow-indigo-950/50 transition-all"
                        >
                            <CheckCircle2 className="mr-1.5 w-4 h-4" />
                            Mark All Read ({unreadCount})
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all border ${
                        activeTab === 'all'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-indigo-300 dark:border-indigo-500/50 shadow-md'
                            : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <Bell className="w-4 h-4" />
                    <span>All Activity</span>
                    {unreadCount > 0 && (
                        <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-indigo-600 text-white">
                            {unreadCount}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all border ${
                        activeTab === 'settings'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-indigo-300 dark:border-indigo-500/50 shadow-md'
                            : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <Settings className="w-4 h-4" />
                    <span>Preferences &amp; Delivery</span>
                </button>
            </div>

            {/* Error Notification */}
            {error && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-medium">
                    {error}
                </div>
            )}

            {/* Tab Contents */}
            {activeTab === 'all' ? (
                <div className="space-y-6">
                    <NotificationFilterBar
                        category={category}
                        onCategoryChange={setCategory}
                        priority={priorityFilter}
                        onPriorityChange={setPriorityFilter}
                        unreadOnly={unreadOnly}
                        onUnreadOnlyChange={setUnreadOnly}
                        search={search}
                        onSearchChange={setSearch}
                        selectedCount={selectedIds.length}
                        totalCount={total}
                        onBulkMarkRead={bulkMarkAsRead}
                        onBulkDelete={bulkDelete}
                        onClearRead={clearAllRead}
                        onClearSelection={clearSelection}
                        onSelectAll={toggleSelectAll}
                        isAllSelected={isAllSelected}
                        isRefreshing={isRefreshing}
                        onRefresh={() => fetchNotifications(true)}
                    />

                    <NotificationListSection
                        notifications={notifications}
                        loading={loading}
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelect}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                        page={page}
                        limit={limit}
                        total={total}
                        hasMore={hasMore}
                        onPageChange={setPage}
                    />
                </div>
            ) : (
                <NotificationSettingsTab />
            )}
        </div>
    );
}

export default NotificationCenter;
