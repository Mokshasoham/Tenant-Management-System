import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../context/authStore';
import { notificationService, propertyService, paymentService, tenantService, maintenanceService, bookingService, visitService, leaseService } from '../services/api';
import { LogOut, Menu, Bell, Search, CheckCircle2, X, ArrowRight, ArrowLeft, Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../utils/cn';
import { useLanguage } from '../context/LanguageContext';
import { useActionCenterNavigation } from '../hooks/useActionCenterNavigation';

import NavbarNotificationBell from '../modules/lease-renewal/notifications/components/NavbarNotificationBell';

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
  const { handleAction } = useActionCenterNavigation();

  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedNotifs, setExpandedNotifs] = useState({});
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const role = user?.role || 'tenant';
  const theme = ROLE_THEME[role] || ROLE_THEME.tenant;

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchData, setSearchData] = useState({ properties: [], payments: [], maintenance: [], tenants: [] });
  const [searchLoading, setSearchLoading] = useState(false);

  // Keyboard shortcut Ctrl+K / Cmd+K to toggle search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(open => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Escape key to close search
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    if (searchOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [searchOpen]);

  // Focus input when search modal opens
  useEffect(() => {
    if (searchOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 50);
    }
  }, [searchOpen]);

  // Prefetch search data on opening search modal
  useEffect(() => {
    if (!searchOpen) return;
    setSearchLoading(true);
    
    const loadSearchData = async () => {
      try {
        const promises = [
          propertyService.getAllProperties({ limit: 50 }),
          role === 'tenant' ? paymentService.getMyPayments() : paymentService.getAllPayments({ limit: 50 }),
          maintenanceService.getAllRequests({ limit: 50 })
        ];
        if (role !== 'tenant') {
          promises.push(tenantService.getAllTenants({ limit: 50 }));
        }

        const results = await Promise.allSettled(promises);
        
        setSearchData({
          properties: results[0].status === 'fulfilled' ? (results[0].value.data?.data || results[0].value.data || []) : [],
          payments: results[1].status === 'fulfilled' ? (results[1].value.data?.data || results[1].value.data || []) : [],
          maintenance: results[2].status === 'fulfilled' ? (results[2].value.data?.data || results[2].value.data || []) : [],
          tenants: (role !== 'tenant' && results[3]?.status === 'fulfilled') ? (results[3].value.data?.data || results[3].value.data || []) : []
        });
      } catch (err) {
        console.error('Failed to prefetch search data', err);
      } finally {
        setSearchLoading(false);
      }
    };

    loadSearchData();
  }, [searchOpen, role]);

  // Filtering calculations
  const filteredLinks = [
    { label: t('nav.dashboard') || 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: t('nav.properties') || 'Properties', path: '/properties', icon: '🏠' },
    { label: t('nav.tenants') || 'Tenants', path: '/tenants', icon: '👥', role: ['manager', 'admin'] },
    { label: t('nav.leases') || 'Leases', path: '/leases', icon: '📄' },
    { label: t('nav.payments') || 'Payments', path: '/payments', icon: '💳' },
    { label: t('nav.maintenance') || 'Maintenance', path: '/maintenance', icon: '🔧' },
    { label: t('nav.messages') || 'Messages', path: '/messages', icon: '💬' },
    { label: t('nav.profile') || 'My Profile', path: '/profile', icon: '👤' },
  ].filter(l => {
    if (l.role && !l.role.includes(role)) return false;
    return l.label.toLowerCase().includes(query.toLowerCase());
  });

  const filteredProperties = searchData.properties.filter(p => 
    p.name?.toLowerCase().includes(query.toLowerCase()) || 
    p.address?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  const filteredPayments = searchData.payments.filter(p => 
    p.type?.toLowerCase().includes(query.toLowerCase()) || 
    p.status?.toLowerCase().includes(query.toLowerCase()) ||
    String(p.amount).includes(query)
  ).slice(0, 5);

  const filteredMaintenance = searchData.maintenance.filter(m => 
    m.description?.toLowerCase().includes(query.toLowerCase()) || 
    m.status?.toLowerCase().includes(query.toLowerCase()) ||
    m.title?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  const filteredTenants = searchData.tenants.filter(t => 
    t.firstName?.toLowerCase().includes(query.toLowerCase()) || 
    t.lastName?.toLowerCase().includes(query.toLowerCase()) || 
    t.email?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

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

  // Sync background read state across other modules instantly
  useEffect(() => {
    const handleRead = (e) => {
      const { id } = e.detail;
      setNotifications(prev => prev.map(x => x._id === id ? { ...x, read: true, isRead: true } : x));
      setUnreadCount(c => Math.max(0, c - 1));
    };
    window.addEventListener('notificationMarkedRead', handleRead);
    return () => window.removeEventListener('notificationMarkedRead', handleRead);
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
    console.log('[Navbar] View Details / Notification clicked:', n);
    setShowNotif(false);
    handleAction(n);
  };

  const handleDeleteNotif = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      const deletedNotif = notifications.find(n => n._id === id);
      if (deletedNotif && !deletedNotif.read) {
        setUnreadCount(c => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className={cn(
      "w-full border border-white/10 dark:border-white/5 bg-[#0e1622]/45 dark:bg-[#070b12]/45 backdrop-blur-xl relative group",
      "px-4 py-2.5 rounded-2xl flex items-center justify-between gap-4 transition-all duration-300",
      "shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
      role === 'admin' && "shadow-violet-500/5 hover:border-violet-500/25",
      role === 'manager' && "shadow-blue-500/5 hover:border-blue-500/25",
      role === 'tenant' && "shadow-emerald-500/5 hover:border-emerald-500/25"
    )}>
      {/* Glossy Reflection Overlay */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 opacity-30" />
        <div className="absolute -inset-y-12 -left-36 w-24 bg-white/10 dark:bg-white/5 blur-xl transform rotate-12 transition-all duration-1000 group-hover:left-[110%]" />
      </div>
      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all">
          <Menu className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setSearchOpen(true)}
          className={cn(
            'hidden sm:flex items-center justify-between gap-2 bg-muted border border-border px-3 py-2 rounded-xl transition-all duration-200 w-64 text-left cursor-text hover:bg-muted-foreground/5',
            theme.searchFocus
          )}
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('common.search') || 'Search'}...</span>
          </div>
          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border/80 bg-background text-[9px] font-black text-muted-foreground/60 select-none">
            Ctrl K
          </kbd>
        </button>
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
        <NavbarNotificationBell />

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

      {/* Spotlight Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSearchOpen(false)}
              className="absolute inset-0 bg-background/60 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -10 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
            >
              {/* Search Header */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/80 flex-shrink-0">
                <Search className="w-5 h-5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search properties, bills, settings..."
                  className="flex-1 bg-transparent border-none outline-none text-base text-foreground placeholder-muted-foreground/50"
                />
                <button
                  onClick={() => setSearchOpen(false)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Results / Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {searchLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-xs font-bold uppercase tracking-wider">Syncing Database...</p>
                  </div>
                ) : (
                  <>
                    {/* If all results are empty */}
                    {filteredLinks.length === 0 &&
                     filteredProperties.length === 0 &&
                     filteredPayments.length === 0 &&
                     filteredMaintenance.length === 0 &&
                     filteredTenants.length === 0 ? (
                      <div className="py-12 text-center space-y-2">
                        <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                        <p className="text-sm font-bold text-foreground">No matches found</p>
                        <p className="text-xs text-muted-foreground/60">Try searching for navigation links, property names, or invoice descriptions.</p>
                      </div>
                    ) : (
                      <>
                        {/* Quick Links Section */}
                        {filteredLinks.length > 0 && (
                          <div className="space-y-1.5">
                            <h3 className="text-[10px] font-black text-muted-foreground/45 uppercase tracking-widest px-2">Quick Navigation</h3>
                            <div className="grid grid-cols-2 gap-1.5">
                              {filteredLinks.map((link) => (
                                <button
                                  key={link.path}
                                  onClick={() => {
                                    navigate(link.path);
                                    setSearchOpen(false);
                                    setQuery('');
                                  }}
                                  className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all text-left group"
                                >
                                  <span className="text-base group-hover:scale-110 transition-transform">{link.icon}</span>
                                  <span className="text-xs font-bold flex-1 truncate">{link.label}</span>
                                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Properties Section */}
                        {filteredProperties.length > 0 && (
                          <div className="space-y-1.5">
                            <h3 className="text-[10px] font-black text-muted-foreground/45 uppercase tracking-widest px-2">Properties</h3>
                            <div className="space-y-1">
                              {filteredProperties.map((p) => (
                                <button
                                  key={p._id}
                                  onClick={() => {
                                    navigate('/properties', { state: { searchId: p._id } });
                                    setSearchOpen(false);
                                    setQuery('');
                                  }}
                                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors text-left group"
                                >
                                  <span className="text-base">🏠</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-foreground group-hover:text-primary transition-colors truncate">{p.name}</p>
                                    <p className="text-[10px] text-muted-foreground/60 truncate">{p.address}</p>
                                  </div>
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                    ₹{p.rentAmount?.toLocaleString('en-IN')}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Payments & Invoices Section */}
                        {filteredPayments.length > 0 && (
                          <div className="space-y-1.5">
                            <h3 className="text-[10px] font-black text-muted-foreground/45 uppercase tracking-widest px-2">Payments & Invoices</h3>
                            <div className="space-y-1">
                              {filteredPayments.map((pay) => (
                                <button
                                  key={pay._id}
                                  onClick={() => {
                                    if (role === 'tenant') {
                                      navigate('/pay-now', { state: { paymentId: pay._id } });
                                    } else {
                                      navigate('/payments', { state: { searchId: pay._id } });
                                    }
                                    setSearchOpen(false);
                                    setQuery('');
                                  }}
                                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors text-left group"
                                >
                                  <span className="text-base">💳</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-foreground group-hover:text-primary transition-colors truncate uppercase tracking-tight">
                                      {pay.type?.replace('_', ' ')}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/60">
                                      Paid: ₹{pay.amountPaid?.toLocaleString('en-IN')} / ₹{pay.amount?.toLocaleString('en-IN')}
                                    </p>
                                  </div>
                                  <span className={cn(
                                    "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                    pay.status === 'paid'
                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                      : pay.status === 'partially_paid'
                                        ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                                        : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                  )}>
                                    {pay.status === 'partially_paid' ? 'Partial' : pay.status === 'paid' ? 'Paid' : 'Due'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Maintenance Section */}
                        {filteredMaintenance.length > 0 && (
                          <div className="space-y-1.5">
                            <h3 className="text-[10px] font-black text-muted-foreground/45 uppercase tracking-widest px-2">Maintenance Requests</h3>
                            <div className="space-y-1">
                              {filteredMaintenance.map((m) => (
                                <button
                                  key={m._id}
                                  onClick={() => {
                                    navigate('/maintenance', { state: { searchId: m._id } });
                                    setSearchOpen(false);
                                    setQuery('');
                                  }}
                                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors text-left group"
                                >
                                  <span className="text-base">🔧</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-foreground group-hover:text-primary transition-colors truncate">{m.title || m.description}</p>
                                    <p className="text-[10px] text-muted-foreground/60 truncate capitalize">Priority: {m.priority} • Category: {m.category}</p>
                                  </div>
                                  <span className={cn(
                                    "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                    m.status === 'resolved'
                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                      : m.status === 'in_progress'
                                        ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                                        : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                  )}>
                                    {m.status?.replace('_', ' ')}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tenants Section (Manager / Admin only) */}
                        {filteredTenants.length > 0 && (
                          <div className="space-y-1.5">
                            <h3 className="text-[10px] font-black text-muted-foreground/45 uppercase tracking-widest px-2">Tenants</h3>
                            <div className="space-y-1">
                              {filteredTenants.map((t) => (
                                <button
                                  key={t._id}
                                  onClick={() => {
                                    navigate('/tenants', { state: { searchId: t._id } });
                                    setSearchOpen(false);
                                    setQuery('');
                                  }}
                                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors text-left group"
                                >
                                  <span className="text-base">👤</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-foreground group-hover:text-primary transition-colors truncate">{t.firstName} {t.lastName}</p>
                                    <p className="text-[10px] text-muted-foreground/60 truncate">{t.email}</p>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground/40 font-bold capitalize">
                                    {t.status}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
}
