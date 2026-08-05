import React from 'react';
import { Search, CheckCircle2, Trash2, X, RefreshCw } from 'lucide-react';
import { CATEGORY_LABELS } from '../constants/notificationConstants';

export function NotificationFilterBar({
    category,
    onCategoryChange,
    priority,
    onPriorityChange,
    unreadOnly,
    onUnreadOnlyChange,
    search,
    onSearchChange,
    selectedCount = 0,
    totalCount = 0,
    onBulkMarkRead,
    onBulkDelete,
    onClearRead,
    onClearSelection,
    onSelectAll,
    isAllSelected = false,
    isRefreshing = false,
    onRefresh
}) {
    return (
        <div className="space-y-4 bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none backdrop-blur-md">
            {/* Top Row: Search & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search notifications by title, message, reference..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all"
                    />
                    {search && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Right Controls: Priority Dropdown, Unread Toggle & Refresh */}
                <div className="flex items-center space-x-3 shrink-0 flex-wrap gap-y-2">
                    {/* Priority Selector */}
                    <div className="relative">
                        <select
                            value={priority}
                            onChange={(e) => onPriorityChange(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                        >
                            <option value="all">All Priorities</option>
                            <option value="critical">Critical Only</option>
                            <option value="high">High Only</option>
                            <option value="medium">Medium Only</option>
                            <option value="low">Low Only</option>
                        </select>
                    </div>

                    {/* Unread Only Switch */}
                    <label className="inline-flex items-center cursor-pointer space-x-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors">
                        <input
                            type="checkbox"
                            checked={unreadOnly}
                            onChange={(e) => onUnreadOnlyChange(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 relative"></div>
                        <span>Unread Only</span>
                    </label>

                    {/* Refresh Button */}
                    <button
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        title="Refresh list"
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:border-slate-300 dark:hover:border-slate-700 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Middle Row: Category Filter Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => {
                    const isActive = category === catKey;
                    return (
                        <button
                            key={catKey}
                            onClick={() => onCategoryChange(catKey)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
                                isActive
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                    : 'bg-slate-100 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            {catLabel}
                        </button>
                    );
                })}
            </div>

            {/* Bottom Toolbar: Bulk Selection Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/60 text-xs">
                <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
                    <label className="inline-flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={onSelectAll}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-white dark:focus:ring-offset-slate-900 cursor-pointer"
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-300">Select All Page</span>
                    </label>
                    {selectedCount > 0 && (
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-500/20">
                            {selectedCount} selected
                        </span>
                    )}
                </div>

                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    {selectedCount > 0 ? (
                        <>
                            <button
                                onClick={onBulkMarkRead}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 transition-colors font-medium"
                            >
                                <CheckCircle2 className="mr-1.5 w-3.5 h-3.5" />
                                Mark Selected Read
                            </button>
                            <button
                                onClick={onBulkDelete}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-500/25 transition-colors font-medium"
                            >
                                <Trash2 className="mr-1.5 w-3.5 h-3.5" />
                                Delete Selected
                            </button>
                            <button
                                onClick={onClearSelection}
                                className="px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            >
                                Clear Selection
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClearRead}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700/80 hover:text-slate-800 dark:hover:text-white transition-colors font-medium"
                        >
                            <Trash2 className="mr-1.5 w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                            Clear All Read Notifications
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default NotificationFilterBar;
