import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSignature,
  Mic,
  Camera,
  MapPin,
  FileText,
  LogIn,
  Trash2,
  Layers,
  ArrowRightLeft,
  Check,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * OfflineSyncCenterModal Component
 * Modal displaying pending offline queue items (Check-in, GPS, Photos, Notes, Voice Notes, Signatures).
 * Features:
 *   - "Sync Now" button
 *   - "Last Sync: X mins ago" indicator
 *   - Conflict Resolution UI if server updatedAt > cached updatedAt:
 *     Displays local change vs server change with "Keep Server", "Keep Mine", "Merge" buttons.
 */
export default function OfflineSyncCenterModal({
  isOpen,
  onClose,
  networkStatus = 'online',
  pendingQueue = [],
  isSyncing = false,
  lastSyncedAt = null,
  syncNow,
  resolveConflict,
  removePendingAction,
}) {
  const [resolvingId, setResolvingId] = useState(null);
  const [selectedItemForMerge, setSelectedItemForMerge] = useState(null);

  if (!isOpen) return null;

  // Category Icon helper
  const getItemIcon = (type) => {
    switch (type) {
      case 'CHECK_IN':
      case 'CHECK_OUT':
        return LogIn;
      case 'GPS_TELEMETRY':
        return MapPin;
      case 'SIGNATURE':
        return FileSignature;
      case 'VOICE_NOTE':
        return Mic;
      case 'PHOTO_UPLOAD':
        return Camera;
      case 'ADD_NOTE':
      default:
        return FileText;
    }
  };

  // Helper to format friendly type label
  const getTypeLabel = (type) => {
    switch (type) {
      case 'CHECK_IN':
        return 'Job Check-In';
      case 'CHECK_OUT':
        return 'Job Check-Out';
      case 'GPS_TELEMETRY':
        return 'GPS Location Update';
      case 'SIGNATURE':
        return 'Work Completion Signature';
      case 'VOICE_NOTE':
        return 'Audio & Speech Transcript';
      case 'PHOTO_UPLOAD':
        return 'Job Phase Photo';
      case 'ADD_NOTE':
        return 'Technician Note';
      default:
        return type || 'Offline Action';
    }
  };

  // Format last sync time string
  const formattedLastSync = lastSyncedAt
    ? formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })
    : 'Never in this session';

  const handleResolution = async (item, strategy) => {
    setResolvingId(item.id);
    try {
      if (resolveConflict) {
        await resolveConflict(item.id, strategy);
      }
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Offline Sync Center
                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-cyan-400 border border-slate-700">
                  {pendingQueue.length} Pending
                </span>
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-slate-500" />
                Last Sync: <span className="text-slate-300 font-medium">{formattedLastSync}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span
              className={`w-2 h-2 rounded-full ${
                networkStatus === 'online'
                  ? 'bg-emerald-400'
                  : networkStatus === 'poor'
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
            />
            <span className="capitalize font-semibold text-slate-300">
              Network: {networkStatus}
            </span>
          </div>

          <button
            onClick={syncNow}
            disabled={isSyncing || networkStatus === 'offline' || pendingQueue.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing Queue...' : 'Sync Now'}
          </button>
        </div>

        {/* Pending Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {pendingQueue.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200">All Changes Synced!</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Your device has no pending offline uploads. All check-ins, photos, signatures, and notes are up to date.
              </p>
            </div>
          ) : (
            pendingQueue.map((item) => {
              const Icon = getItemIcon(item.type);
              const isConflict = item.conflict;

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isConflict
                      ? 'bg-amber-950/30 border-amber-500/40 shadow-lg shadow-amber-500/5'
                      : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-xl border shrink-0 ${
                          isConflict
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-slate-800 text-cyan-400 border-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-white">
                            {getTypeLabel(item.type)}
                          </h4>
                          {item.ticketId && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                              Ticket: {item.ticketId}
                            </span>
                          )}
                          {isConflict && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <AlertTriangle className="w-3 h-3" />
                              Conflict Detected
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400">
                          Cached: {new Date(item.cachedUpdatedAt || item.createdAt).toLocaleTimeString()}
                        </p>

                        {/* Content preview */}
                        {item.payload && (
                          <div className="mt-2 text-[11px] text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1 font-mono">
                            {item.payload.text && <div>Text: "{item.payload.text}"</div>}
                            {item.payload.transcript && <div>Transcript: "{item.payload.transcript}"</div>}
                            {item.payload.notes && <div>Notes: "{item.payload.notes}"</div>}
                            {item.payload.latitude && (
                              <div>
                                GPS: {item.payload.latitude?.toFixed(4)}, {item.payload.longitude?.toFixed(4)}
                              </div>
                            )}
                            {item.type === 'SIGNATURE' && (
                              <div>Signature captured (Tech & Tenant)</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick remove button */}
                    {removePendingAction && (
                      <button
                        onClick={() => removePendingAction(item.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Discard pending action"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Conflict Resolution Drawer */}
                  {isConflict && (
                    <div className="mt-4 pt-3 border-t border-amber-500/30 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                        <ArrowRightLeft className="w-4 h-4" />
                        <span>Conflict Resolution Required</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Server state was modified after your cached offline entry ({new Date(item.cachedUpdatedAt).toLocaleTimeString()}). Choose how to resolve:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <button
                          onClick={() => handleResolution(item, 'keep_server')}
                          disabled={resolvingId === item.id}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5 text-rose-400" />
                          Keep Server
                        </button>

                        <button
                          onClick={() => handleResolution(item, 'keep_mine')}
                          disabled={resolvingId === item.id}
                          className="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold border border-cyan-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5 text-cyan-400" />
                          Keep Mine
                        </button>

                        <button
                          onClick={() => handleResolution(item, 'merge')}
                          disabled={resolvingId === item.id}
                          className="px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold border border-purple-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Layers className="w-3.5 h-3.5 text-purple-400" />
                          Merge Both
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
