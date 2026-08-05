import React from 'react';

export function NotificationListSkeleton({ count = 5 }) {
    return (
        <div className="space-y-4 animate-pulse">
            {Array.from({ length: count }).map((_, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 flex items-start space-x-4">
                    <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 shrink-0 mt-1"></div>
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0"></div>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16"></div>
                        </div>
                        <div className="h-3.5 bg-slate-100 dark:bg-slate-800/60 rounded w-4/5"></div>
                        <div className="flex items-center space-x-3 pt-1">
                            <div className="h-3 bg-slate-100 dark:bg-slate-800/40 rounded w-20"></div>
                            <div className="h-3 bg-slate-100 dark:bg-slate-800/40 rounded w-16"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default NotificationListSkeleton;
