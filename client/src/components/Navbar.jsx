import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../context/authStore';
import { notificationService } from '../services/api';
import { LogOut, Menu, Bell, Search, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { useLanguage } from '../context/LanguageContext';

const ROLE_THEME = {
  admin: {
    pillBg: 'bg-violet-500/10 dark:bg-violet-500/20 border-violet-500/20 dark:border-violet-500/30 text-violet-700 dark:text-violet-300',
    pillDot: 'bg-violet-400',
    avatarGrad: 'from-violet-500 to-purple-600',
    avatarGlow: 'rgba(124,58,237,0.4)',
    searchFocus: 'focus-within:border-violet-500/50 focus-within:bg-violet-500/5',
    label: 'Admin', emoji: '⚡',
  },
  manager: {
    pillBg: 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20 dark:border-blue-500/30 text-blue-700 dark:text-blue-300',
    pillDot: 'bg-blue-400',
    avatarGrad: 'from-blue-500 to-cyan-600',
    avatarGlow: 'rgba(59,130,246,0.4)',
    searchFocus: 'focus-within:border-blue-500/50 focus-within:bg-blue-500/5',
    label: 'Manager', emoji: '🏢',
  },
  tenant: {
    pillBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    pillDot: 'bg-emerald-400',
    avatarGrad: 'from-emerald-500 to-teal-600',
    avatarGlow: 'rgba(16,185,129,0.4)',
    searchFocus: 'focus-within:border-emerald-500/50 focus-within:bg-emerald-500/5',
    label: 'Tenant', emoji: '🏡',
  },
};

const TYPE_ICONS = {
  payment_due: '💳', payment_received: '✅', payment_overdue: '⚠️',
  maintenance_created: '🔧', maintenance_update: '🔄', maintenance_resolved: '✔️',
  lease_expiry: '📄', lease_created: '📝', message: '💬', system: '🔔',
  tenant_created: '👤', property_created: '🏠',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Navbar({ toggleSidebar }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { t } = useLanguage();

  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const role = user?.role || 'tenant';
  const theme = ROLE_THEME[role] || ROLE_THEME.tenant;

  // Fetch unread count (poll every 30s)
  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        const res = await notificationService.getUnreadCount();
        if (mounted) setUnreadCount(res.data?.count || 0);
      } catch (_) { }
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (!showNotif) return;
    notificationService.getMyNotifications({ limit: 10 })
      .then(res => setNotifications(res.data?.data || res.data || []))
      .catch(() => { });
  }, [showNotif]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowNotif(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (_) { }
  };

  const handleNotifClick = async (n) => {
    if (!n.read) {
      try {
        await notificationService.markRead(n._id);
        setUnreadCount(c => Math.max(0, c - 1));
        setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
      } catch (_) { }
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur-xl px-4 md:px-6 py-3 flex items-center justify-between gap-4 transition-colors duration-300">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all">
          <Menu className="w-5 h-5" />
        </button>
        <div className={cn('hidden sm:flex items-center gap-2 bg-muted border border-border px-3 py-2 rounded-xl transition-all duration-200', theme.searchFocus)}>
          <Search className="w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder={t('common.search') + '...'} className="bg-transparent border-none outline-none text-sm text-foreground placeholder-muted-foreground w-48" />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Role Badge */}
        <div className={cn('hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold', theme.pillBg)}>
          <span>{theme.emoji}</span>
          <span>{theme.label}</span>
          <span className={cn('w-1.5 h-1.5 rounded-full ml-0.5', theme.pillDot)} />
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setShowNotif(v => !v)}
            className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-destructive rounded-full border border-background flex items-center justify-center text-[9px] font-black text-destructive-foreground leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotif && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-80 rounded-2xl border border-border bg-card/98 backdrop-blur-xl shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="text-sm font-black text-foreground">{t('settings.notifications')}</p>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors">
                      <CheckCircle2 className="w-3 h-3" /> {t('common.markAllRead') || 'Mark all read'}
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-border">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground/30 text-sm">{t('common.noData') || 'No notifications yet'}</div>
                  ) : notifications.map((n) => (
                    <button key={n._id} onClick={() => handleNotifClick(n)}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors text-left">
                      <span className="text-lg leading-none mt-0.5 flex-shrink-0">{TYPE_ICONS[n.type] || '🔔'}</span>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-semibold truncate', n.read ? 'text-muted-foreground' : 'text-foreground')}>{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Avatar */}
        <button onClick={() => navigate('/profile')} className="flex items-center gap-2 pl-1">
          <motion.div
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-lg cursor-pointer', `bg-gradient-to-br ${theme.avatarGrad}`)}
            style={{ boxShadow: `0 4px 16px ${theme.avatarGlow}` }}
          >
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </motion.div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-foreground/80 leading-none">{user?.firstName} {user?.lastName}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{user?.role}</p>
          </div>
        </button>

        {/* Logout */}
        <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all ml-1" title={t('nav.logout') || 'Sign Out'}>
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
