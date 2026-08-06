import React from 'react';
import {
  Wifi,
  WifiOff,
  SignalLow,
  CloudUpload,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';
import { useOfflineSync } from '../../hooks/useOfflineSync';

/**
 * ConnectivityBanner Component
 * Mobile-first dark enterprise network status banner displayed at the top of the Technician Portal.
 * Indicates: 🟢 Online, 🟠 Poor Network, or 🔴 Offline
 * Shows "Pending Uploads: N" badge with "Sync Center" button.
 */
export default function ConnectivityBanner({
  networkStatus: propNetworkStatus,
  pendingCount: propPendingCount,
  onOpenSyncCenter,
  onSyncNow,
  isSyncing: propIsSyncing,
}) {
  // Use hook values if props are not explicitly provided
  const hookData = useOfflineSync();
  const networkStatus = propNetworkStatus || hookData.networkStatus;
  const pendingCount = propPendingCount ?? hookData.pendingCount;
  const isSyncing = propIsSyncing ?? hookData.isSyncing;
  const syncNow = onSyncNow || hookData.syncNow;

  // Don't render banner if online with zero pending uploads to keep top bar super clean
  if (networkStatus === 'online' && pendingCount === 0) {
    return null;
  }

  // Render status badge configuration
  const getStatusConfig = () => {
    switch (networkStatus) {
      case 'offline':
        return {
          bg: 'bg-rose-950/80 border-rose-800/80 text-rose-300',
          dot: 'bg-rose-500 animate-ping',
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          icon: WifiOff,
          label: 'Offline Mode',
          subtext: 'Changes saved locally to device',
        };
      case 'poor':
        return {
          bg: 'bg-amber-950/80 border-amber-800/80 text-amber-300',
          dot: 'bg-amber-500 animate-pulse',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: SignalLow,
          label: 'Poor Network',
          subtext: 'Low bandwidth detected',
        };
      case 'online':
      default:
        return {
          bg: 'bg-slate-900/90 border-slate-800 text-slate-200',
          dot: 'bg-emerald-400',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          icon: Wifi,
          label: 'Online',
          subtext: 'Connected to field server',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={`w-full border-b px-4 py-2.5 backdrop-blur-xl transition-all shadow-lg ${config.bg}`}
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs font-medium">
        {/* Network Status Indicator */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
          </div>
          <div className="flex items-center gap-1.5 font-bold tracking-wide uppercase text-[11px]">
            <Icon className="w-4 h-4 shrink-0" />
            <span>{config.label}</span>
          </div>
          <span className="hidden sm:inline text-slate-400 text-[11px] border-l border-slate-700/60 pl-2.5">
            {config.subtext}
          </span>
        </div>

        {/* Pending Uploads & Actions */}
        <div className="flex items-center gap-2.5 ml-auto">
          {pendingCount > 0 && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${config.badgeBg}`}
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span>Pending Uploads: {pendingCount}</span>
            </div>
          )}

          {/* Sync Now Action Button */}
          {pendingCount > 0 && networkStatus !== 'offline' && (
            <button
              onClick={syncNow}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all active:scale-95 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}

          {/* Open Sync Center Modal Button */}
          {onOpenSyncCenter && (
            <button
              onClick={onOpenSyncCenter}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95 text-[11px] font-semibold cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Sync Center</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
