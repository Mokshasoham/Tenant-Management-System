import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2,
    Trash2,
    Clock,
    AlertTriangle,
    FileText,
    DollarSign,
    Shield,
    Bell,
    ExternalLink,
    RefreshCw,
    MessageSquare,
    Wrench,
    Check
} from 'lucide-react';
import { CATEGORY_LABELS } from '../constants/notificationConstants';

function formatRelativeTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getCategoryIcon(category) {
    switch (category) {
        case 'renewal':   return <RefreshCw    className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />;
        case 'lease':     return <FileText      className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
        case 'booking':   return <Clock         className="w-4 h-4 text-purple-500 dark:text-purple-400" />;
        case 'billing':
        case 'payments':  return <DollarSign    className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />;
        case 'maintenance': return <Wrench      className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
        case 'messages':  return <MessageSquare className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />;
        case 'security':  return <Shield        className="w-4 h-4 text-rose-500 dark:text-rose-400" />;
        default:          return <Bell          className="w-4 h-4 text-slate-400 dark:text-slate-400" />;
    }
}

function getPriorityBadge(priority) {
    switch (priority) {
        case 'critical':
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
                    <AlertTriangle className="mr-1 w-3 h-3" /> Critical
                </span>
            );
        case 'high':
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                    High
                </span>
            );
        case 'medium':
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                    Medium
                </span>
            );
        case 'low':
        default:
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-normal bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
                    Low
                </span>
            );
    }
}

export function NotificationItem({
    notification,
    isSelected = false,
    onToggleSelect,
    onMarkAsRead,
    onDelete
}) {
    const navigate = useNavigate();

    const handleCardClick = (e) => {
        if (e.target.closest('.action-button') || e.target.closest('.item-checkbox')) return;

        if (!notification.isRead && onMarkAsRead) {
            onMarkAsRead(notification.id);
        }

        if (notification.actionUrl) {
            if (notification.actionUrl.startsWith('http')) {
                window.open(notification.actionUrl, '_blank', 'noopener,noreferrer');
            } else {
                navigate(notification.actionUrl);
            }
        }
    };

    return (
        <div
            onClick={handleCardClick}
            className={`group relative p-4 rounded-xl transition-all duration-200 border cursor-pointer ${
                notification.isRead
                    ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800/40 opacity-80 hover:opacity-100'
                    : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-700/80 shadow-md dark:shadow-lg dark:shadow-indigo-950/20 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-slate-850'
            } ${isSelected ? 'ring-2 ring-indigo-500/80 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-500/50' : ''}`}
        >
            <div className="flex items-start space-x-3.5">
                {/* Checkbox for Bulk Actions */}
                <div className="pt-0.5 item-checkbox">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect && onToggleSelect(notification.id)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-white dark:focus:ring-offset-slate-900 cursor-pointer"
                    />
                </div>

                {/* Category Icon */}
                <div className={`p-2.5 rounded-xl shrink-0 border ${
                    notification.isRead
                        ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/40'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-md'
                }`}>
                    {getCategoryIcon(notification.category)}
                </div>

                {/* Main Notification Content */}
                <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                                {CATEGORY_LABELS[notification.category] || notification.category}
                            </span>
                            {getPriorityBadge(notification.priority)}
                            {!notification.isRead && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white tracking-wide uppercase">
                                    New
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-slate-400 shrink-0 font-mono">
                            {formatRelativeTime(notification.createdAt)}
                        </span>
                    </div>

                    <h4 className={`text-sm font-semibold mb-1 truncate ${
                        notification.isRead
                            ? 'text-slate-500 dark:text-slate-300 font-normal'
                            : 'text-slate-900 dark:text-white font-semibold'
                    }`}>
                        {notification.title}
                    </h4>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2">
                        {notification.message}
                    </p>

                    {/* Footer Meta & Deep Link */}
                    {notification.actionUrl && (
                        <div className="inline-flex items-center text-xs font-medium text-indigo-500 dark:text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                            <span>View details</span>
                            <ExternalLink className="ml-1 w-3 h-3" />
                        </div>
                    )}
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center space-x-1 shrink-0 action-button opacity-80 group-hover:opacity-100 transition-opacity">
                    {!notification.isRead && (
                        <button
                            onClick={() => onMarkAsRead && onMarkAsRead(notification.id)}
                            title="Mark as read"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => onDelete && onDelete(notification.id)}
                        title="Delete notification"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default NotificationItem;
