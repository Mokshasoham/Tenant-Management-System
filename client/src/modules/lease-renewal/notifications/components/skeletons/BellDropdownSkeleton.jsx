import React from 'react';

export function BellDropdownSkeleton({ count = 3 }) {
    return (
        <div className="space-y-3 p-3 animate-pulse">
            {Array.from({ length: count }).map((_, idx) => (
                <div key={idx} className="flex items-start space-x-3 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/30">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700/60 shrink-0"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-slate-200 dark:bg-slate-700/80 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded w-5/6"></div>
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-700/40 rounded w-1/3 mt-1"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default BellDropdownSkeleton;
