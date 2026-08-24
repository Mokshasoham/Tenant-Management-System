import React, { useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ScrollToTopButton from '../components/common/ScrollToTopButton';
import useAuthStore from '../context/authStore';
import { technicianPortalService } from '../services/api';
import {
  LayoutDashboard,
  Wrench,
  Calendar,
  MessageSquare,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronDown,
  QrCode,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import ConnectivityBanner from '../components/technician/ConnectivityBanner';
import OfflineSyncCenterModal from '../components/technician/OfflineSyncCenterModal';
import { useOfflineSync } from '../hooks/useOfflineSync';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/technician/dashboard', icon: LayoutDashboard },
  { label: 'My Jobs', path: '/technician/jobs', icon: Wrench },
  { label: 'Schedule', path: '/technician/schedule', icon: Calendar },
  { label: 'QR Scanner', path: '/technician/qr-scanner', icon: QrCode },
  { label: 'Messages', path: '/technician/messages', icon: MessageSquare },
  { label: 'Notifications', path: '/technician/notifications', icon: Bell },
  { label: 'Profile', path: '/technician/profile', icon: User },
];

const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Available', color: 'bg-emerald-500' },
  { value: 'busy', label: 'Busy / On Job', color: 'bg-amber-500' },
  { value: 'break', label: 'On Break', color: 'bg-blue-500' },
  { value: 'off_duty', label: 'Off Duty', color: 'bg-slate-500' },
];

export default function TechnicianLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const setUser = useAuthStore((state) => state.setUser);

  const offlineSync = useOfflineSync();
  const techMainRef = useRef(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSyncCenterOpen, setIsSyncCenterOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(
    user?.technicianProfile?.availabilityStatus || 'available'
  );
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const handleStatusChange = async (newStatus) => {
    setIsUpdatingStatus(true);
    setShowStatusDropdown(false);
    try {
      await technicianPortalService.updateMyAvailability(newStatus);
      const updatedUser = {
        ...user,
        technicianProfile: {
          ...user?.technicianProfile,
          availabilityStatus: newStatus,
        },
      };
      setUser(updatedUser);
      setCurrentStatus(newStatus);
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const activeOption =
    AVAILABILITY_OPTIONS.find((o) => o.value === currentStatus) || AVAILABILITY_OPTIONS[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-4 sticky top-0 h-screen z-30">
        {/* Brand */}
        <div className="flex items-center gap-3 px-3 py-4 border-b border-slate-800/80 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Tech Workspace
            </h1>
            <p className="text-xs text-cyan-400 font-mono flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              {user?.technicianProfile?.employeeId || 'TECH-PORTAL'}
            </p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="pt-4 border-t border-slate-800/80 mt-auto">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 mb-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden font-bold text-sm text-cyan-400 border border-cyan-500/30">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                `${user?.firstName?.[0] || 'T'}${user?.lastName?.[0] || ''}`
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-slate-400 truncate font-mono">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 border border-transparent transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="text-sm font-semibold text-slate-200 hidden sm:block">
              Field Operations Mobile Workspace
            </h2>
          </div>

          {/* Availability Status Selector */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              disabled={isUpdatingStatus}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700/60 text-xs font-medium hover:border-slate-600 transition-all cursor-pointer"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${activeOption.color} animate-pulse`} />
              <span className="text-slate-200">{activeOption.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showStatusDropdown && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-1 z-50">
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-all text-left cursor-pointer"
                  >
                    <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Connectivity Status Banner */}
        <ConnectivityBanner
          networkStatus={offlineSync.networkStatus}
          pendingCount={offlineSync.pendingCount}
          isSyncing={offlineSync.isSyncing}
          onSyncNow={offlineSync.syncNow}
          onOpenSyncCenter={() => setIsSyncCenterOpen(true)}
        />

        {/* Mobile Nav Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden border-b border-slate-800 bg-slate-900/95 backdrop-blur-xl px-4 py-3 space-y-1 z-30"
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                  navigate('/login');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-all mt-2 border-t border-slate-800 pt-3 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <main ref={techMainRef} className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>

        <ScrollToTopButton containerRef={techMainRef} />
      </div>

      {/* Offline Sync Center Modal */}
      <OfflineSyncCenterModal
        isOpen={isSyncCenterOpen}
        onClose={() => setIsSyncCenterOpen(false)}
        networkStatus={offlineSync.networkStatus}
        pendingQueue={offlineSync.pendingQueue}
        isSyncing={offlineSync.isSyncing}
        lastSyncedAt={offlineSync.lastSyncedAt}
        syncNow={offlineSync.syncNow}
        resolveConflict={offlineSync.resolveConflict}
      />
    </div>
  );
}
