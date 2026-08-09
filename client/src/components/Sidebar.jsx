import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../context/authStore';
import { useTheme } from '../context/ThemeContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '../context/LanguageContext';
import {
  LayoutDashboard, Users, FileText, CreditCard, X,
  Building2, Wrench, UserCog, MessageSquare, Home, LogOut, BarChart2, Wallet, Compass,
  Bookmark, Scale, Settings, Sun, Moon, Languages, Receipt, Bell, UserCheck, Calendar, ShieldCheck
} from 'lucide-react';
import { cn } from '../utils/cn';

const ROLE_CONFIG = {
  admin: {
    label: 'Admin',
    sublabel: 'System Command Center',
    gradient: 'from-violet-600 via-purple-600 to-indigo-600',
    glowColor: 'rgba(124, 58, 237, 0.4)',
    activeBorder: 'border-violet-400/50',
    activeText: 'text-violet-600 dark:text-violet-300',
    hoverBg: 'hover:bg-violet-500/10 dark:hover:bg-violet-900/20',
    orb1: '#7c3aed',
    orb2: '#6d28d9',
    navActiveStyle: 'bg-violet-500/10 dark:bg-violet-500/20 border-l-2 border-violet-500 text-violet-700 dark:text-violet-200',
    iconActive: 'text-violet-600 dark:text-violet-300',
    badgeBg: 'bg-violet-500',
    activePill: 'bg-violet-500',
    roleIcon: '⚡',
  },
  manager: {
    label: 'Manager',
    sublabel: 'Property Operations',
    gradient: 'from-blue-500 via-cyan-500 to-sky-600',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    activeBorder: 'border-blue-400/50',
    activeText: 'text-blue-600 dark:text-blue-300',
    hoverBg: 'hover:bg-blue-500/10 dark:hover:bg-blue-900/20',
    orb1: '#2563eb',
    orb2: '#0891b2',
    navActiveStyle: 'bg-blue-500/10 dark:bg-blue-500/20 border-l-2 border-blue-500 text-blue-700 dark:text-blue-200',
    iconActive: 'text-blue-600 dark:text-blue-300',
    badgeBg: 'bg-blue-500',
    activePill: 'bg-blue-500',
    roleIcon: '🏢',
  },
  tenant: {
    label: 'Tenant',
    sublabel: 'Resident Portal',
    gradient: 'from-emerald-500 via-teal-500 to-green-600',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    activeBorder: 'border-emerald-400/50',
    activeText: 'text-emerald-600 dark:text-emerald-300',
    hoverBg: 'hover:bg-emerald-500/10 dark:hover:bg-emerald-900/20',
    orb1: '#059669',
    orb2: '#0d9488',
    navActiveStyle: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-l-2 border-emerald-500 text-emerald-700 dark:text-emerald-200',
    iconActive: 'text-emerald-600 dark:text-emerald-300',
    badgeBg: 'bg-emerald-500',
    activePill: 'bg-emerald-500',
    roleIcon: '🏡',
  },
  technician: {
    label: 'Technician',
    sublabel: 'Field Workspace',
    gradient: 'from-cyan-500 via-teal-500 to-sky-600',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    activeBorder: 'border-cyan-400/50',
    activeText: 'text-cyan-600 dark:text-cyan-300',
    hoverBg: 'hover:bg-cyan-500/10 dark:hover:bg-cyan-900/20',
    orb1: '#06b6d4',
    orb2: '#0d9488',
    navActiveStyle: 'bg-cyan-500/10 dark:bg-cyan-500/20 border-l-2 border-cyan-500 text-cyan-700 dark:text-cyan-200',
    iconActive: 'text-cyan-600 dark:text-cyan-300',
    badgeBg: 'bg-cyan-500',
    activePill: 'bg-cyan-500',
    roleIcon: '🔧',
  },
};

const ALL_NAV_ITEMS = [
  { label: 'Dashboard', key: 'dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'manager', 'tenant', 'technician'] },
  { label: 'My Jobs', key: 'myJobs', icon: Wrench, path: '/technician/jobs', roles: ['technician'] },
  { label: 'Schedule', key: 'techSchedule', icon: Calendar, path: '/technician/schedule', roles: ['technician'] },
  { label: 'QR Scanner', key: 'techQr', icon: ShieldCheck, path: '/technician/qr', roles: ['technician'] },
  { label: 'Find a Home', key: 'browse', icon: Compass, path: '/browse', roles: ['admin', 'tenant'] },
  { label: 'Saved Homes', key: 'saved', icon: Bookmark, path: '/saved', roles: ['tenant'] },
  { label: 'Compare', key: 'compare', icon: Scale, path: '/compare', roles: ['tenant'] },
  { label: 'Properties', key: 'properties', icon: Home, path: '/properties', roles: ['admin', 'manager'] },
  { label: 'People Command Center', key: 'peopleCommandCenter', icon: Users, path: '/admin/people', roles: ['admin'] },
  { label: 'Tenants', key: 'tenantsManager', icon: Users, path: '/tenants', roles: ['manager'] },
  { label: 'Workforce', key: 'technicians', icon: UserCheck, path: '/technicians', roles: ['admin', 'manager'] },
  { label: 'Dispatch Board', key: 'workforceScheduling', icon: Calendar, path: '/workforce-scheduling', roles: ['admin', 'manager'] },
  { label: 'Leases', key: 'leases', icon: FileText, path: '/leases', roles: ['admin', 'manager'] },
  { label: 'Payments', key: 'payments', icon: CreditCard, path: '/payments', roles: ['admin', 'manager', 'tenant'] },
  { label: 'Bills', key: 'bills', icon: Receipt, path: '/bills', roles: ['tenant'] },
  { label: 'My Lease', key: 'myLease', icon: FileText, path: '/my-lease', roles: ['tenant'] },
  { label: 'Pay Now', key: 'payNow', icon: Wallet, path: '/pay-now', roles: ['tenant'] },
  { label: 'Verification', key: 'tenantVerification', icon: ShieldCheck, path: '/tenant/verification', roles: ['tenant'] },
  { label: 'Maintenance', key: 'maintenance', icon: Wrench, path: '/maintenance', roles: ['admin', 'manager', 'tenant'] },
  { label: 'Analytics', key: 'analytics', icon: BarChart2, path: '/analytics', roles: ['admin', 'manager'] },
  { label: 'Verification', key: 'verification', icon: ShieldCheck, path: '/manager/verification', roles: ['manager'] },
  { label: 'Property Verification', key: 'propertyVerification', icon: Home, path: '/property/verification', roles: ['admin', 'manager'] },
  { label: 'Technician Verification', key: 'technicianVerification', icon: Wrench, path: '/technician/verification', roles: ['technician'] },
  { label: 'Verification Center', key: 'adminVerificationCenter', icon: ShieldCheck, path: '/admin/verification', roles: ['admin'] },
  { label: 'Messages', key: 'messages', icon: MessageSquare, path: '/messages', roles: ['admin', 'manager', 'tenant', 'technician'], badge: true },
  { label: 'Notifications', key: 'notifications', icon: Bell, path: '/notifications', roles: ['admin', 'manager', 'tenant', 'technician'] },
  { label: 'Profile', key: 'techProfile', icon: UserCog, path: '/technician/profile', roles: ['technician'] },
  { label: 'Users', key: 'users', icon: UserCog, path: '/users', roles: ['admin'] },
  { label: 'Settings', key: 'settings', icon: Settings, path: '/settings', roles: ['admin', 'manager', 'tenant'] },
];


export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { theme: colorTheme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [showLangPicker, setShowLangPicker] = React.useState(false);

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  const role = user?.role || 'tenant';
  // 'user' is a legacy role — treat as tenant
  const effectiveRole = role === 'user' ? 'tenant' : role;
  const theme = ROLE_CONFIG[effectiveRole] || ROLE_CONFIG.tenant;
  const navItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(effectiveRole));

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel */}
      <div
        className={cn(
          // Position
          'fixed top-0 left-0 z-50 lg:relative lg:z-auto',
          // Layout
          'flex flex-col overflow-hidden',
          // Mobile/Desktop hide/show and width transition
          'transition-all duration-300 ease-in-out',
          isOpen 
            ? 'translate-x-0 w-72 border-r' 
            : '-translate-x-full lg:translate-x-0 w-0 lg:w-20 border-r',
          // Size
          'h-screen',
          // Theme
          'transition-colors duration-300'
        )}
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderColor: 'var(--glass-border)',
        }}
      >
        {/* Decorative orbs — absolute, do NOT affect flex flow */}
        <div
          className="pointer-events-none absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-10 dark:opacity-20 transition-opacity"
          style={{ background: theme.orb1, filter: 'blur(60px)' }}
        />
        <div
          className="pointer-events-none absolute bottom-24 -right-12 w-48 h-48 rounded-full opacity-5 dark:opacity-15 transition-opacity"
          style={{ background: theme.orb2, filter: 'blur(60px)' }}
        />

        {/* ───── HEADER (flex-shrink-0 so it never collapses) ───── */}
        <div className="relative flex-shrink-0 flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br flex-shrink-0',
                theme.gradient,
              )}
              style={{ boxShadow: `0 4px 20px ${theme.glowColor}` }}
            >
              <Building2 className="w-5 h-5" />
            </motion.div>
            <div className={cn("transition-opacity duration-200", isOpen ? "opacity-100 block" : "opacity-0 hidden")}>
              <h2 className="text-lg font-black text-foreground tracking-tight leading-none">TMS</h2>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">{theme.sublabel}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ───── ROLE BADGE (flex-shrink-0) ───── */}
        <div className="relative flex-shrink-0 px-4 pb-4">
          <div
            className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all duration-200', theme.activeBorder, !isOpen && 'justify-center px-1')}
            style={{ background: theme.glowColor.replace('0.4', '0.08') }}
          >
            <span className="text-base flex-shrink-0">{theme.roleIcon}</span>
            <div className={cn("flex-1 min-w-0 transition-opacity duration-200", isOpen ? "opacity-100 block" : "opacity-0 hidden")}>
              <p className={cn('text-xs font-black uppercase tracking-wider', theme.activeText)}>{theme.label}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.firstName} {user?.lastName}</p>
            </div>
            {/* Live indicator */}
            {isOpen && (
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', theme.badgeBg)} />
                <span className={cn('relative inline-flex rounded-full h-2 w-2', theme.badgeBg)} />
              </span>
            )}
          </div>
        </div>

        {/* ───── NAV (flex-1 + min-h-0 = fills middle, scrolls if needed) ───── */}
        <nav className="relative flex-1 min-h-0 overflow-y-auto px-3 pb-2">
          <p className={cn("text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/50 px-3 mb-3 mt-1 transition-opacity", !isOpen && "opacity-0 hidden")}>
            Navigation
          </p>
          <div className="space-y-0.5">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.25 }}
                >
                  <Link
                    to={item.path}
                    onClick={handleLinkClick}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                      !isOpen && 'justify-center px-1.5',
                      isActive
                        ? theme.navActiveStyle
                        : cn('text-muted-foreground hover:text-foreground', theme.hoverBg)
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-[18px] h-[18px] flex-shrink-0 transition-colors',
                        isActive ? theme.iconActive : 'text-muted-foreground/60 group-hover:text-foreground/80'
                      )}
                    />
                    <span className={cn("font-semibold text-sm tracking-tight flex-1 whitespace-nowrap transition-opacity duration-200", !isOpen && "w-0 opacity-0 hidden")}>
                      {t(`nav.${item.key}`, item.label)}
                    </span>
                    {item.badge && !isActive && isOpen && (
                      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', theme.badgeBg)} />
                    )}
                    {isActive && isOpen && (
                      <motion.div
                        layoutId="sidebar-active-pill"
                        className={cn('absolute right-2 w-1 h-5 rounded-full', theme.activePill)}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </nav>

        {/* ───── FOOTER (flex-shrink-0) ───── */}
        <div className="relative flex-shrink-0 px-3 py-3 border-t border-border">
          {/* Theme + Language quick controls */}
          <div className={cn("flex items-center gap-2 mb-3 px-1 transition-all duration-200", !isOpen && "flex-col gap-1.5")}>
            {/* Theme toggle */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={toggleTheme}
              className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all", !isOpen && "w-full py-2.5")}
              style={{
                background: colorTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: colorTheme === 'dark' ? '#60a5fa' : '#2563eb',
                border: colorTheme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)',
              }}
              title={colorTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {colorTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {isOpen && (colorTheme === 'dark' ? 'Light' : 'Dark')}
            </motion.button>

            {/* Language picker */}
            <div className={cn("relative", !isOpen && "w-full")}>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setShowLangPicker(v => !v)}
                className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all", !isOpen && "w-full justify-center py-2.5")}
                style={{
                  background: colorTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  border: colorTheme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Languages className="w-4 h-4" />
                {isOpen && <span className="uppercase">{language}</span>}
              </motion.button>
              <AnimatePresence>
                {showLangPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className={cn("absolute bottom-full mb-2 right-0 rounded-xl overflow-hidden shadow-2xl z-50 transition-colors", !isOpen && "left-0 right-auto")}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', minWidth: '120px' }}
                  >
                    {SUPPORTED_LANGUAGES.map(({ code, name, nativeName, flag }) => (
                      <button
                        key={code}
                        onClick={() => { setLanguage(code); setShowLangPicker(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-white/10"
                        style={{
                          color: code === language ? 'var(--primary)' : 'var(--text-secondary)',
                          background: code === language ? 'rgba(var(--primary), 0.1)' : 'transparent',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}
                      >
                        <span>{flag}</span>
                        <span>{nativeName || name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all group", !isOpen && "justify-center px-1.5")}
          >
            <LogOut className="w-[18px] h-[18px] group-hover:translate-x-0.5 transition-transform" />
            <span className={cn("font-semibold text-sm transition-opacity duration-200", !isOpen && "w-0 opacity-0 hidden")}>{t('nav.logout') || 'Sign Out'}</span>
          </button>
          <p className={cn("text-[9px] text-muted-foreground/30 font-bold uppercase tracking-widest px-3 mt-2", !isOpen && "hidden")}>
            TMS Platform v2.0
          </p>
        </div>
      </div>
    </>
  );
}
