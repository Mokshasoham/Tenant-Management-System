import React, { useState } from 'react';
import { FiBell, FiMail, FiSmartphone, FiShield, FiSave, FiCheck } from 'react-icons/fi';

export function NotificationSettingsTab() {
    const [settings, setSettings] = useState({
        emailRenewals: true,
        emailBilling: true,
        emailMaintenance: true,
        smsUrgent: true,
        inAppSound: true,
        digestFrequency: 'realtime'
    });

    const [isSaved, setIsSaved] = useState(false);

    const handleToggle = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2500);
    };

    return (
        <div className="space-y-6 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 max-w-3xl">
            <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <FiBell className="text-indigo-400" />
                    Notification Delivery Preferences
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                    Manage how and when you receive automated platform notifications across email, SMS, and in-app alerts.
                </p>
            </div>

            <div className="space-y-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Dispatch Options</h4>
                
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center space-x-3">
                        <FiMail className="w-5 h-5 text-indigo-400 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-slate-200">Lease Renewal & Campaign Bulletins</p>
                            <p className="text-xs text-slate-400">Receive instant email updates when lease renewal offers or escalations trigger.</p>
                        </div>
                    </div>
                    <input 
                        type="checkbox"
                        checked={settings.emailRenewals}
                        onChange={() => handleToggle('emailRenewals')}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center space-x-3">
                        <FiMail className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-slate-200">Billing & Payment Confirmations</p>
                            <p className="text-xs text-slate-400">Get notified when invoices are created, payments clear, or payouts complete.</p>
                        </div>
                    </div>
                    <input 
                        type="checkbox"
                        checked={settings.emailBilling}
                        onChange={() => handleToggle('emailBilling')}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                </div>
            </div>

            <div className="space-y-4 pt-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">SMS & Critical Alerts</h4>
                
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center space-x-3">
                        <FiSmartphone className="w-5 h-5 text-rose-400 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-slate-200">Critical & SLA Urgent SMS Alerts</p>
                            <p className="text-xs text-slate-400">Dispatch SMS for critical security risks or expired SLA deadlines.</p>
                        </div>
                    </div>
                    <input 
                        type="checkbox"
                        checked={settings.smsUrgent}
                        onChange={() => handleToggle('smsUrgent')}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-800">
                <span className="text-xs text-slate-500">Preferences are synced to your tenant user profile.</span>
                <button
                    onClick={handleSave}
                    className="inline-flex items-center px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-950/50"
                >
                    {isSaved ? (
                        <>
                            <FiCheck className="mr-1.5 w-4 h-4 text-emerald-300" />
                            Preferences Saved
                        </>
                    ) : (
                        <>
                            <FiSave className="mr-1.5 w-4 h-4" />
                            Save Preferences
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

export default NotificationSettingsTab;
