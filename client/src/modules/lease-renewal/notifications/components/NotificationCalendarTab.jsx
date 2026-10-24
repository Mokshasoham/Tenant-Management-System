import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    CalendarDays,
    Clock,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Filter,
    Inbox,
    Bell
} from 'lucide-react';
import notificationService from '../services/notificationService';
import NotificationItem from './NotificationItem';
import NotificationListSkeleton from './skeletons/NotificationListSkeleton';
import { useLanguage } from '../../../../context/LanguageContext';
import {
    WEEKDAY_NAMES,
    MONTH_NAMES,
    getBrowserTimezone,
    getBrowserTimezoneOffset,
    formatDateKey,
    parseDateKey,
    getLocalDayBoundaries,
    getMonthGrid,
    formatFriendlyDate
} from '../utils/calendarDateUtils';

export function NotificationCalendarTab({
    onMarkAllRead,
    unreadCount = 0,
    onNotificationMutated
}) {
    const { t, formatDate } = useLanguage();
    // Current viewed month and year
    const today = useMemo(() => new Date(), []);
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    // Selected date (defaults to today's date)
    const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(today));

    // Monthly calendar summary (counts and badges per dateKey)
    const [calendarSummary, setCalendarSummary] = useState({});
    const [summaryLoading, setSummaryLoading] = useState(true);

    // Selected day's notifications
    const [dayNotifications, setDayNotifications] = useState([]);
    const [dayLoading, setDayLoading] = useState(false);
    const [dayError, setDayError] = useState(null);

    // Optional category & priority filter for the calendar
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [unreadOnlyFilter, setUnreadOnlyFilter] = useState(false);

    // Selected items inside the day's stream for bulk actions
    const [selectedDayIds, setSelectedDayIds] = useState([]);

    const timezone = useMemo(() => getBrowserTimezone(), []);
    const timezoneOffset = useMemo(() => getBrowserTimezoneOffset(), []);

    // Generate grid for currently viewed month
    const gridData = useMemo(() => {
        return getMonthGrid(viewYear, viewMonth);
    }, [viewYear, viewMonth]);

    // Fetch calendar summary for the visible grid range
    const fetchMonthlySummary = useCallback(async (isSilent = false) => {
        if (!isSilent) setSummaryLoading(true);
        try {
            const params = {
                startDate: gridData.gridStartIso,
                endDate: gridData.gridEndIso,
                timezone,
                timezoneOffset,
                ...(categoryFilter !== 'all' && { category: categoryFilter }),
                ...(priorityFilter !== 'all' && { priority: priorityFilter }),
                ...(unreadOnlyFilter && { unreadOnly: true })
            };

            const res = await notificationService.getCalendarSummary(params);
            const summary = res?.data?.summary || res?.summary || {};
            setCalendarSummary(summary);
        } catch (err) {
            console.error('[NotificationCalendarTab] Failed to fetch monthly summary:', err);
        } finally {
            setSummaryLoading(false);
        }
    }, [gridData.gridStartIso, gridData.gridEndIso, timezone, timezoneOffset, categoryFilter, priorityFilter, unreadOnlyFilter]);

    // Fetch notifications strictly for the selected date
    const fetchSelectedDateNotifications = useCallback(async (dateKey, isSilent = false) => {
        if (!dateKey) return;
        if (!isSilent) setDayLoading(true);
        setDayError(null);

        try {
            const { startDate, endDate } = getLocalDayBoundaries(dateKey);
            const params = {
                startDate,
                endDate,
                page: 1,
                limit: 100, // Show all notifications for that specific date
                ...(categoryFilter !== 'all' && { category: categoryFilter }),
                ...(priorityFilter !== 'all' && { priority: priorityFilter }),
                ...(unreadOnlyFilter && { unreadOnly: true })
            };

            const res = await notificationService.getNotifications(params);
            const items = Array.isArray(res) ? res : (res?.data || []);
            setDayNotifications(items);
        } catch (err) {
            console.error('[NotificationCalendarTab] Failed to fetch date notifications:', err);
            setDayError('Failed to load notifications for this date');
        } finally {
            setDayLoading(false);
        }
    }, [categoryFilter, priorityFilter, unreadOnlyFilter]);

    // When month changes or filters change, fetch monthly summary
    useEffect(() => {
        fetchMonthlySummary();
    }, [fetchMonthlySummary]);

    // When selected date changes or filters change, fetch notifications for that day
    useEffect(() => {
        fetchSelectedDateNotifications(selectedDateKey);
        setSelectedDayIds([]);
    }, [selectedDateKey, fetchSelectedDateNotifications]);

    // Month Navigation Controls
    const handlePrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(prev => prev - 1);
        } else {
            setViewMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(prev => prev + 1);
        } else {
            setViewMonth(prev => prev + 1);
        }
    };

    const handleGoToToday = () => {
        const now = new Date();
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
        setSelectedDateKey(formatDateKey(now));
    };

    const handleSelectDay = (day) => {
        setSelectedDateKey(day.dateKey);
        // If clicking leading/trailing month day, automatically navigate view month
        if (!day.isCurrentMonth) {
            setViewYear(day.date.getFullYear());
            setViewMonth(day.date.getMonth());
        }
    };

    // Item Action handlers with optimistic updates for day stream & monthly summary
    const handleMarkItemRead = async (id) => {
        setDayNotifications(prev => prev.map(item =>
            item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
        ));
        setCalendarSummary(prev => {
            const current = prev[selectedDateKey];
            if (!current) return prev;
            return {
                ...prev,
                [selectedDateKey]: {
                    ...current,
                    unreadCount: Math.max(0, (current.unreadCount || 1) - 1)
                }
            };
        });

        try {
            await notificationService.markAsRead(id);
            if (onNotificationMutated) onNotificationMutated();
        } catch (err) {
            console.error('Failed to mark read:', err);
            fetchSelectedDateNotifications(selectedDateKey, true);
        }
    };

    const handleDeleteItem = async (id) => {
        const target = dayNotifications.find(n => n.id === id);
        setDayNotifications(prev => prev.filter(item => item.id !== id));
        setCalendarSummary(prev => {
            const current = prev[selectedDateKey];
            if (!current) return prev;
            return {
                ...prev,
                [selectedDateKey]: {
                    ...current,
                    count: Math.max(0, (current.count || 1) - 1),
                    unreadCount: target && !target.isRead ? Math.max(0, (current.unreadCount || 1) - 1) : current.unreadCount
                }
            };
        });

        try {
            await notificationService.deleteNotification(id);
            if (onNotificationMutated) onNotificationMutated();
        } catch (err) {
            console.error('Failed to delete notification:', err);
            fetchSelectedDateNotifications(selectedDateKey, true);
        }
    };

    const handleToggleSelectDayItem = (id) => {
        setSelectedDayIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSelectAllDayItems = () => {
        if (selectedDayIds.length === dayNotifications.length) {
            setSelectedDayIds([]);
        } else {
            setSelectedDayIds(dayNotifications.map(n => n.id));
        }
    };

    const handleBulkMarkReadDay = async () => {
        if (selectedDayIds.length === 0) return;
        const targetSet = new Set(selectedDayIds);
        setDayNotifications(prev => prev.map(item =>
            targetSet.has(item.id) ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
        ));
        setSelectedDayIds([]);

        try {
            await notificationService.bulkMarkAsRead(Array.from(targetSet));
            fetchMonthlySummary(true);
            if (onNotificationMutated) onNotificationMutated();
        } catch (err) {
            console.error('Failed bulk mark read:', err);
            fetchSelectedDateNotifications(selectedDateKey, true);
        }
    };

    const selectedDaySummary = calendarSummary[selectedDateKey] || { count: dayNotifications.length, unreadCount: 0 };
    const friendlySelectedDate = formatFriendlyDate(selectedDateKey);

    return (
        <div className="space-y-6">
            {/* Top Bar: Calendar Navigation & Month Switcher */}
            <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Month & Year Title with Controls */}
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    {gridData.monthName} {gridData.year}
                                </h2>
                                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    {timezone}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t('notification.calendarSubtitle', 'Select any date to inspect notifications created on that day.')}
                            </p>
                        </div>
                    </div>

                    {/* Right: Previous, Today, Next Buttons */}
                    <div className="flex items-center space-x-2 shrink-0">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            aria-label={t('notification.prevMonth', 'Previous month')}
                            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onClick={handleGoToToday}
                            className="inline-flex items-center px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all shadow-sm cursor-pointer"
                        >
                            <CalendarDays className="w-4 h-4 mr-1.5 text-indigo-500" />
                            {t('notification.calendarToday', 'Today')}
                        </button>

                        <button
                            type="button"
                            onClick={handleNextMonth}
                            aria-label={t('notification.nextMonth', 'Next month')}
                            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors cursor-pointer"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                fetchMonthlySummary(true);
                                fetchSelectedDateNotifications(selectedDateKey, true);
                            }}
                            title={t('common.refresh', 'Refresh')}
                            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-slate-300 dark:hover:border-slate-700 transition-colors ml-1 cursor-pointer"
                        >
                            <RefreshCw className={`w-4 h-4 ${summaryLoading ? 'animate-spin text-indigo-500' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Filter Pills for Calendar View */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                        <span className="text-slate-400 dark:text-slate-500 font-medium inline-flex items-center">
                            <Filter className="w-3.5 h-3.5 mr-1" />
                            {t('common.filter', 'Filter by')}:
                        </span>
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                            <option value="all">{t('notification.priorityAll', 'All Priorities')}</option>
                            <option value="critical">{t('notification.priorityCritical', 'Critical')}</option>
                            <option value="high">{t('notification.priorityHigh', 'High')}</option>
                            <option value="medium">{t('notification.priorityMedium', 'Medium')}</option>
                            <option value="low">{t('notification.priorityLow', 'Low')}</option>
                        </select>

                        <label className="inline-flex items-center space-x-1.5 cursor-pointer bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors">
                            <input
                                type="checkbox"
                                checked={unreadOnlyFilter}
                                onChange={(e) => setUnreadOnlyFilter(e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                            />
                            <span>{t('notification.unreadOnly', 'Unread only')}</span>
                        </label>
                    </div>

                    <div className="text-slate-400 dark:text-slate-500 text-[11px] font-medium">
                        Showing daily distribution in <span className="font-semibold text-slate-600 dark:text-slate-300">local timezone</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area: 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Interactive Month Grid (7 Cols on desktop) */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900/60 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm backdrop-blur-md">
                    {/* Grid Days of Week Header (Monday through Sunday) */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
                        {WEEKDAY_NAMES.map(weekday => (
                            <div
                                key={weekday}
                                className="py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
                            >
                                {weekday}
                            </div>
                        ))}
                    </div>

                    {/* Month Day Cells */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                        {gridData.days.map((day) => {
                            const isSelected = day.dateKey === selectedDateKey;
                            const daySummary = calendarSummary[day.dateKey];
                            const count = daySummary?.count || 0;
                            const dayUnread = daySummary?.unreadCount || 0;
                            const hasCritical = (daySummary?.criticalCount || 0) > 0;

                            return (
                                <button
                                    key={day.dateKey}
                                    type="button"
                                    onClick={() => handleSelectDay(day)}
                                    aria-label={`${day.dateKey}${count ? `, ${count} notifications` : ''}`}
                                    className={`relative min-h-[58px] sm:min-h-[76px] p-1.5 sm:p-2 rounded-xl text-left flex flex-col justify-between transition-all duration-150 border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400/60 dark:ring-indigo-500/60 z-10'
                                            : day.isToday
                                                ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-500/40 text-slate-900 dark:text-white hover:border-indigo-300 dark:hover:border-indigo-400'
                                                : day.isCurrentMonth
                                                    ? 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-850 hover:border-indigo-200 dark:hover:border-slate-700'
                                                    : 'bg-transparent border-transparent text-slate-400 dark:text-slate-600 opacity-40 hover:opacity-80'
                                    }`}
                                >
                                    {/* Top Row: Day Number & Today indicator */}
                                    <div className="flex items-center justify-between w-full">
                                        <span
                                            className={`text-xs sm:text-sm font-semibold rounded-md px-1 ${
                                                isSelected
                                                    ? 'text-white'
                                                    : day.isToday
                                                        ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                                                        : 'text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            {day.dayNumber}
                                        </span>

                                        {day.isToday && !isSelected && (
                                            <span className="hidden sm:inline-block text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 px-1 rounded bg-indigo-100 dark:bg-indigo-500/20">
                                                Today
                                            </span>
                                        )}
                                    </div>

                                    {/* Bottom Row: Notification Count Badge & Indicators */}
                                    <div className="flex items-center justify-between w-full mt-1">
                                        {count > 0 ? (
                                            <span
                                                className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                    isSelected
                                                        ? 'bg-white text-indigo-700'
                                                        : hasCritical
                                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                                                            : dayUnread > 0
                                                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                                                                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                }`}
                                            >
                                                {count}
                                            </span>
                                        ) : (
                                            <span />
                                        )}

                                        {/* Subtle unread dot */}
                                        {dayUnread > 0 && (
                                            <span
                                                className={`w-2 h-2 rounded-full ${
                                                    isSelected
                                                        ? 'bg-amber-300 ring-2 ring-indigo-600'
                                                        : 'bg-indigo-500 dark:bg-indigo-400'
                                                }`}
                                                title={`${dayUnread} unread notifications`}
                                            />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-3">
                            <span className="inline-flex items-center">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 mr-1.5" />
                                Unread
                            </span>
                            <span className="inline-flex items-center">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5" />
                                Critical / High
                            </span>
                            <span className="inline-flex items-center">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-1 ring-indigo-300 mr-1.5" />
                                Selected
                            </span>
                        </div>
                        <div>
                            Click any date to view its activity stream
                        </div>
                    </div>
                </div>

                {/* Right Column: Selected Date Notifications Stream (5 Cols on desktop) */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm backdrop-blur-md space-y-4">
                    {/* Header for Selected Date */}
                    <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                Date View
                            </span>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                                {friendlySelectedDate}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {dayNotifications.length} notification{dayNotifications.length === 1 ? '' : 's'} on this date
                            </p>
                        </div>

                        {/* Bulk actions for this date */}
                        {dayNotifications.length > 0 && (
                            <div className="flex items-center space-x-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={handleSelectAllDayItems}
                                    className="px-2 py-1 text-[11px] rounded-lg font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    {selectedDayIds.length === dayNotifications.length ? 'Deselect' : 'Select All'}
                                </button>
                                {selectedDayIds.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleBulkMarkReadDay}
                                        className="inline-flex items-center px-2 py-1 text-[11px] font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm"
                                    >
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Read ({selectedDayIds.length})
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Stream Content */}
                    {dayLoading ? (
                        <NotificationListSkeleton count={3} />
                    ) : dayError ? (
                        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs">
                            {dayError}
                        </div>
                    ) : dayNotifications.length === 0 ? (
                        <div className="text-center py-12 px-4 bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                                <Inbox className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                No notifications for this date.
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                                There were no notifications or alerts created on {friendlySelectedDate}.
                            </p>
                            <button
                                type="button"
                                onClick={handleGoToToday}
                                className="mt-4 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
                            >
                                <CalendarDays className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                                Return to Today
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                            {dayNotifications.map((item) => (
                                <NotificationItem
                                    key={item.id}
                                    notification={item}
                                    isSelected={selectedDayIds.includes(item.id)}
                                    onToggleSelect={handleToggleSelectDayItem}
                                    onMarkAsRead={handleMarkItemRead}
                                    onDelete={handleDeleteItem}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default NotificationCalendarTab;
