import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../context/authStore';
import { useTheme } from '../context/ThemeContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '../context/LanguageContext';
import {
  LayoutDashboard, Users, FileText, CreditCard, X,
  Building2, Wrench, UserCog, MessageSquare, Home, LogOut, BarChart2, Wallet, Compass,
  Bookmark, Scale, Settings, Sun, Moon, Languages
} from 'lucide-react';
import { cn } from '../utils/cn';

const ROLE_CONFIG = {
  admin: {
    label: 'Admin',
    sublabel: 'System Command Center',
    gradient: 'from-violet-600 via-purple-600 to-indigo-600',
    glowColor: 'rgba(124, 58, 237, 0.4)',
    activeBorder: 'border-violet-400/50',
    activeText: 'text-violet-300',
    hoverBg: 'hover:bg-violet-900/20',
    orb1: '#7c3aed',
    orb2: '#6d28d9',
    navActiveStyle: 'bg-gradient-to-r from-violet-500/20 via-purple-500/10 to-transparent border-l-2 border-violet-400 text-violet-200',
    iconActive: 'text-violet-300',
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
    activeText: 'text-blue-300',
    hoverBg: 'hover:bg-blue-900/20',
    orb1: '#2563eb',
    orb2: '#0891b2',
    navActiveStyle: 'bg-gradient-to-r from-blue-500/20 via-cyan-500/10 to-transparent border-l-2 border-blue-400 text-blue-200',
    iconActive: 'text-blue-300',
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
    activeText: 'text-emerald-300',
    hoverBg: 'hover:bg-emerald-900/20',
    orb1: '#059669',
    orb2: '#0d9488',
    navActiveStyle: 'bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent border-l-2 border-emerald-400 text-emerald-200',
    iconActive: 'text-emerald-300',
    badgeBg: 'bg-emerald-500',
    activePill: 'bg-emerald-500',
    roleIcon: '🏡',
  },
};

const ALL_NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'manager', 'tenant'] },
  { label: 'Find a Home', icon: Compass, path: '/browse', roles: ['admin', 'tenant'] },
  { label: 'Saved Homes', icon: Bookmark, path: '/saved', roles: ['tenant'] },
  { label: 'Compare', icon: Scale, path: '/compare', roles: ['tenant'] },
  { label: 'Properties', icon: Home, path: '/properties', roles: ['admin', 'manager'] },
  { label: 'Tenants', icon: Users, path: '/tenants', roles: ['admin', 'manager'] },
  { label: 'Leases', icon: FileText, path: '/leases', roles: ['admin', 'manager'] },
  { label: 'Payments', icon: CreditCard, path: '/payments', roles: ['admin', 'manager', 'tenant'] },
  { label: 'My Lease', icon: FileText, path: '/my-lease', roles: ['tenant'] },
  { label: 'Pay Now', icon: Wallet, path: '/pay-now', roles: ['tenant'] },
  { label: 'Maintenance', icon: Wrench, path: '/maintenance', roles: ['admin', 'manager', 'tenant'] },
  { label: 'Analytics', icon: BarChart2, path: '/analytics', roles: ['admin', 'manager'] },
  { label: 'Messages', icon: MessageSquare, path: '/messages', roles: ['admin', 'manager', 'tenant'], badge: true },
  { label: 'Users', icon: UserCog, path: '/users', roles: ['admin'] },
  { label: 'Settings', icon: Settings, path: '/settings', roles: ['admin', 'manager', 'tenant'] },
];


export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { theme: colorTheme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [showLangPicker, setShowLangPicker] = React.useState(false);

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
          // Size
          'w-72 h-screen',
          // Layout — CRITICAL: flex column from top
          'flex flex-col',
          // Mobile hide/show
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{
          background: 'linear-gradient(180deg, #080810 0%, #0d0d18 40%, #060610 100%)',
          borderRight: `1px solid ${theme.glowColor.replace('0.4', '0.15')}`,
        }}
      >
        {/* Decorative orbs — absolute, do NOT affect flex flow */}
        <div
          className="pointer-events-none absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-20"
          style={{ background: theme.orb1, filter: 'blur(60px)' }}
        />
        <div
          className="pointer-events-none absolute bottom-24 -right-12 w-48 h-48 rounded-full opacity-15"
          style={{ background: theme.orb2, filter: 'blur(60px)' }}
        />

        {/* ───── HEADER (flex-shrink-0 so it never collapses) ───── */}
        <div className="relative flex-shrink-0 flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br',
                theme.gradient,
              )}
              style={{ boxShadow: `0 4px 20px ${theme.glowColor}` }}
            >
              <Building2 className="w-5 h-5" />
            </motion.div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight leading-none">TMS</h2>
              <p className="text-[10px] text-white/40 font-semibold uppercase tracking-widest">{theme.sublabel}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ───── ROLE BADGE (flex-shrink-0) ───── */}
        <div className="relative flex-shrink-0 px-4 pb-4">
          <div
            className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-xl border', theme.activeBorder)}
            style={{ background: theme.glowColor.replace('0.4', '0.08') }}
          >
            <span className="text-base flex-shrink-0">{theme.roleIcon}</span>
            <div className="flex-1 min-w-0">
              <p className={cn('text-xs font-black uppercase tracking-wider', theme.activeText)}>{theme.label}</p>
              <p className="text-[10px] text-white/30 truncate">{user?.firstName} {user?.lastName}</p>
            </div>
            {/* Live indicator */}
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', theme.badgeBg)} />
              <span className={cn('relative inline-flex rounded-full h-2 w-2', theme.badgeBg)} />
            </span>
          </div>
        </div>

        {/* ───── NAV (flex-1 + min-h-0 = fills middle, scrolls if needed) ───── */}
        <nav className="relative flex-1 min-h-0 overflow-y-auto px-3 pb-2">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/20 px-3 mb-3 mt-1">
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
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                      isActive
                        ? theme.navActiveStyle
                        : cn('text-white/40 hover:text-white/80', theme.hoverBg)
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-[18px] h-[18px] flex-shrink-0 transition-colors',
                        isActive ? theme.iconActive : 'text-white/30 group-hover:text-white/60'
                      )}
                    />
                    <span className="font-semibold text-sm tracking-tight flex-1 whitespace-nowrap">
                      {item.label}
                    </span>
                    {item.badge && !isActive && (
                      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', theme.badgeBg)} />
                    )}
                    {isActive && (
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
        <div className="relative flex-shrink-0 px-3 py-3 border-t border-white/5">
          {/* Theme + Language quick controls */}
          <div className="flex items-center gap-2 mb-3 px-1">
            {/* Theme toggle */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: colorTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)',
                color: colorTheme === 'dark' ? '#60a5fa' : '#fbbf24',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              title={colorTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {colorTheme === 'dark'
                ? <><Sun className="w-3.5 h-3.5" /> Light</>
                : <><Moon className="w-3.5 h-3.5" /> Dark</>}
            </motion.button>

            {/* Language picker */}
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setShowLangPicker(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                <Languages className="w-3.5 h-3.5" />
                <span className="uppercase">{language}</span>
              </motion.button>
              <AnimatePresence>
                {showLangPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute bottom-full mb-2 right-0 rounded-xl overflow-hidden shadow-2xl z-50"
                    style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', minWidth: '120px' }}
                  >
                    {SUPPORTED_LANGUAGES.map(({ code, name, nativeName, flag }) => (
                      <button
                        key={code}
                        onClick={() => { setLanguage(code); setShowLangPicker(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-white/10"
                        style={{
                          color: code === language ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                          background: code === language ? 'rgba(167,139,250,0.12)' : 'transparent',
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
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all group"
          >
            <LogOut className="w-[18px] h-[18px] group-hover:translate-x-0.5 transition-transform" />
            <span className="font-semibold text-sm">Sign Out</span>
          </button>
          <p className="text-[9px] text-white/15 font-bold uppercase tracking-widest px-3 mt-2">
            TMS Platform v2.0
          </p>
        </div>
      </div>
    </>
  );
}
