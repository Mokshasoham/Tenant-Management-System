import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Settings, Moon, Sun, Globe, Bell, BellOff, Mail, Smartphone,
    Check, ChevronDown, Palette, Shield, User, Save
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '../context/LanguageContext';
import useAuthStore from '../context/authStore';
import { cn } from '../utils/cn';

const SettingsSection = ({ icon: Icon, title, children, gradient }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 mb-4 bg-card border border-border shadow-sm transition-colors"
    >
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl shadow-lg" style={{ background: gradient }}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
        </div>
        {children}
    </motion.div>
);

const Toggle = ({ value, onChange, label, sublabel }) => (
    <div className="flex items-center justify-between py-3 border-b border-border">
        <div>
            <p className="font-semibold text-sm text-foreground">{label}</p>
            {sublabel && <p className="text-xs mt-0.5 text-muted-foreground">{sublabel}</p>}
        </div>
        <button
            onClick={() => onChange(!value)}
            className="relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0"
            style={{ background: value ? '#10b981' : 'var(--muted)' }}
        >
            <motion.div
                animate={{ x: value ? 24 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
            />
        </button>
    </div>
);

const SettingsPage = () => {
    const { theme, toggleTheme } = useTheme();
    const { language, setLanguage, t } = useLanguage();
    const user = useAuthStore((state) => state.user);
    const [showLangDropdown, setShowLangDropdown] = useState(false);

    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        bookingUpdates: true,
        paymentAlerts: true,
        maintenanceAlerts: true,
        marketingEmails: false,
    });

    const selectedLang = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

    const updateNotif = (key) => (val) => setNotifications(n => ({ ...n, [key]: val }));

    return (
        <div className="min-h-screen p-6 bg-background transition-colors">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        <Settings className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-foreground">{t('settings.title')}</h1>
                        <p className="text-muted-foreground">Customize your experience</p>
                    </div>
                </div>

                {/* Appearance */}
                <SettingsSection icon={Palette} title="Appearance" gradient="linear-gradient(135deg, #8b5cf6, #6366f1)">
                    <div className="flex gap-4 mb-4">
                        {/* Dark Mode Card */}
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => theme !== 'dark' && toggleTheme()}
                            className={cn(
                                "flex-1 p-4 rounded-xl flex flex-col items-center gap-3 transition-all border-2",
                                theme === 'dark' ? "bg-primary/10 border-primary" : "bg-muted border-border"
                            )}
                        >
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#0a0a14' }}>
                                <Moon className="w-6 h-6 text-indigo-400" />
                            </div>
                            <span className="text-sm font-bold text-foreground">Dark Mode</span>
                            {theme === 'dark' && (
                                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#6366f1' }}>
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            )}
                        </motion.button>

                        {/* Light Mode Card */}
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => theme !== 'light' && toggleTheme()}
                            className={cn(
                                "flex-1 p-4 rounded-xl flex flex-col items-center gap-3 transition-all border-2",
                                theme === 'light' ? "bg-amber-500/10 border-amber-500" : "bg-muted border-border"
                            )}
                        >
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#fef9c3' }}>
                                <Sun className="w-6 h-6 text-yellow-500" />
                            </div>
                            <span className="text-sm font-bold text-foreground">Light Mode</span>
                            {theme === 'light' && (
                                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#f59e0b' }}>
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            )}
                        </motion.button>
                    </div>
                </SettingsSection>

                {/* Language */}
                <SettingsSection icon={Globe} title="Language" gradient="linear-gradient(135deg, #10b981, #059669)">
                    <p className="text-sm mb-4 text-muted-foreground">
                        Choose your preferred language for the interface
                    </p>
                    <div className="relative">
                        <button
                            onClick={() => setShowLangDropdown(!showLangDropdown)}
                            className="w-full px-4 py-3 rounded-xl flex items-center justify-between bg-muted border border-border"
                        >
                            <span className="flex items-center gap-3 font-semibold text-foreground">
                                <span className="text-xl">{selectedLang.flag}</span>
                                <span>{selectedLang.nativeName}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-border text-muted-foreground">
                                    {selectedLang.name}
                                </span>
                            </span>
                            <ChevronDown className={cn("w-4 h-4 transition-transform text-muted-foreground", showLangDropdown && "rotate-180")} />
                        </button>

                        {showLangDropdown && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute top-full mt-2 w-full rounded-xl overflow-hidden z-50 bg-card border border-border shadow-lg"
                            >
                                {SUPPORTED_LANGUAGES.map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => { setLanguage(lang.code); setShowLangDropdown(false); }}
                                        className={cn(
                                            "w-full px-4 py-3 flex items-center justify-between hover:bg-muted transition-colors border-b border-border last:border-0",
                                            lang.code === language && "bg-emerald-500/10"
                                        )}
                                    >
                                        <span className="flex items-center gap-3 text-foreground">
                                            <span className="text-xl">{lang.flag}</span>
                                            <span className="font-semibold">{lang.nativeName}</span>
                                            <span className="text-sm text-muted-foreground">{lang.name}</span>
                                        </span>
                                        {lang.code === language && <Check className="w-4 h-4 text-emerald-400" />}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </div>
                </SettingsSection>

                {/* Notifications */}
                <SettingsSection icon={Bell} title="Notifications" gradient="linear-gradient(135deg, #f59e0b, #f97316)">
                    <Toggle
                        value={notifications.email}
                        onChange={updateNotif('email')}
                        label="Email Notifications"
                        sublabel="Receive updates via email"
                    />
                    <Toggle
                        value={notifications.push}
                        onChange={updateNotif('push')}
                        label="Push Notifications"
                        sublabel="Browser push notifications"
                    />
                    <Toggle
                        value={notifications.bookingUpdates}
                        onChange={updateNotif('bookingUpdates')}
                        label="Booking Updates"
                        sublabel="Approval, rejection, and status changes"
                    />
                    <Toggle
                        value={notifications.paymentAlerts}
                        onChange={updateNotif('paymentAlerts')}
                        label="Payment Alerts"
                        sublabel="Rent reminders and payment confirmations"
                    />
                    <Toggle
                        value={notifications.maintenanceAlerts}
                        onChange={updateNotif('maintenanceAlerts')}
                        label="Maintenance Alerts"
                        sublabel="Updates on maintenance requests"
                    />
                    <Toggle
                        value={notifications.marketingEmails}
                        onChange={updateNotif('marketingEmails')}
                        label="Marketing Emails"
                        sublabel="New property suggestions and offers"
                    />
                </SettingsSection>

                {/* Account Info */}
                <SettingsSection icon={User} title="Account" gradient="linear-gradient(135deg, #3b82f6, #1d4ed8)">
                    <div className="space-y-3">
                        {[
                            ['Email', user?.email],
                            ['Role', user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '—'],
                            ['Name', `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '—'],
                        ].map(([label, val]) => (
                            <div key={label} className="flex justify-between py-2 border-b border-border last:border-0">
                                <span className="text-sm font-medium text-muted-foreground">{label}</span>
                                <span className="text-sm font-bold text-foreground">{val}</span>
                            </div>
                        ))}
                    </div>
                </SettingsSection>

                {/* Save notice */}
                <div className="text-center text-sm text-muted-foreground/40 mt-8">
                    ✓ Settings are automatically saved to your device
                </div>
            </motion.div>
        </div>
    );
};

export default SettingsPage;
