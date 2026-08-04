import React from 'react';

export function UnreadBadgeSkeleton() {
    return (
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500"></span>
        </span>
    );
}

export default UnreadBadgeSkeleton;
