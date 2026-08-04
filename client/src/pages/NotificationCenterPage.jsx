import React from 'react';
import NotificationCenter from '../modules/lease-renewal/notifications/NotificationCenter';

export function NotificationCenterPage() {
    return (
        <div className="min-h-screen bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
            <NotificationCenter />
        </div>
    );
}

export default NotificationCenterPage;
