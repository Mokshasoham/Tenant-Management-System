import { useState, useEffect, useCallback, useRef } from 'react';
import {
  addPendingAction,
  getPendingActions,
  removePendingAction,
  markActionSynced,
  clearSyncedActions,
} from '../utils/offlineStore';
import { maintenanceService, technicianPortalService } from '../services/api';

/**
 * Custom Hook: useOfflineSync
 * Manages real-time network status ('online' | 'poor' | 'offline'),
 * handles pending offline queue storage in IndexedDB, triggers auto/manual sync,
 * and handles conflict resolution UI logic.
 */
export function useOfflineSync() {
  const [networkStatus, setNetworkStatus] = useState('online');
  const [pendingQueue, setPendingQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const syncInProgressRef = useRef(false);

  // Determine current connection quality
  const checkConnectionQuality = useCallback(() => {
    if (!navigator.onLine) {
      return 'offline';
    }

    const conn =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (conn) {
      if (
        conn.effectiveType === '2g' ||
        conn.effectiveType === 'slow-2g' ||
        conn.rtt > 800 ||
        conn.downlink < 0.5
      ) {
        return 'poor';
      }
    }

    return 'online';
  }, []);

  // Refresh pending queue from IndexedDB
  const refreshPendingQueue = useCallback(async () => {
    try {
      const items = await getPendingActions();
      setPendingQueue(items || []);
    } catch (err) {
      console.error('Failed to load pending queue from IndexedDB:', err);
    }
  }, []);

  // Update status listeners
  useEffect(() => {
    const updateStatus = () => {
      const status = checkConnectionQuality();
      setNetworkStatus(status);
    };

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    const conn =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (conn && conn.addEventListener) {
      conn.addEventListener('change', updateStatus);
    }

    // Initial load of pending queue
    refreshPendingQueue();

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      if (conn && conn.removeEventListener) {
        conn.removeEventListener('change', updateStatus);
      }
    };
  }, [checkConnectionQuality, refreshPendingQueue]);

  /**
   * Helper to enqueue an offline action
   */
  const addOfflineAction = useCallback(
    async ({ type, ticketId, payload, cachedUpdatedAt }) => {
      try {
        const item = await addPendingAction({
          type,
          ticketId,
          payload,
          cachedUpdatedAt: cachedUpdatedAt || new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
        await refreshPendingQueue();
        return item;
      } catch (err) {
        console.error('Failed to enqueue offline action:', err);
        throw err;
      }
    },
    [refreshPendingQueue]
  );

  /**
   * Internal function to execute an action against backend APIs
   */
  const executeAction = async (action) => {
    const { type, ticketId, payload } = action;

    switch (type) {
      case 'CHECK_IN':
        return await technicianPortalService.checkInJob(ticketId, payload);

      case 'CHECK_OUT':
        return await technicianPortalService.checkOutJob(ticketId, payload);

      case 'GPS_TELEMETRY':
        return await technicianPortalService.updateLocationTelemetry(payload);

      case 'ADD_NOTE':
        return await maintenanceService.addNote(ticketId, payload.text, payload.attachmentUrl);

      case 'SIGNATURE':
        return await maintenanceService.saveSignature(ticketId, payload);

      case 'VOICE_NOTE': {
        // If payload contains base64 audio, convert back to Blob
        let formData = new FormData();
        if (payload.audioBase64) {
          const res = await fetch(payload.audioBase64);
          const blob = await res.blob();
          formData.append('audio', blob, 'voice_note.webm');
        }
        formData.append('transcript', payload.transcript || '');
        formData.append('duration', payload.duration || 0);
        return await maintenanceService.uploadVoiceNote(ticketId, formData);
      }

      case 'PHOTO_UPLOAD': {
        let formData = new FormData();
        if (payload.photoBase64) {
          const res = await fetch(payload.photoBase64);
          const blob = await res.blob();
          formData.append('photos', blob, 'photo.jpg');
        }
        if (payload.caption) formData.append('caption', payload.caption);
        return await maintenanceService.uploadPhasePhotos(
          ticketId,
          payload.phase || 'during',
          formData
        );
      }

      default:
        console.warn(`Unknown action type: ${type}`);
        return { success: true };
    }
  };

  /**
   * Sync all pending queue items
   */
  const syncNow = useCallback(async () => {
    if (syncInProgressRef.current) return;
    if (!navigator.onLine) {
      console.warn('Cannot sync while offline.');
      return;
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);

    try {
      const items = await getPendingActions();
      const updatedQueue = [...items];

      for (const item of items) {
        if (item.synced) continue;

        try {
          // Check for simulated or real conflict (server updatedAt > cachedUpdatedAt)
          // If server reports conflict:
          const result = await executeAction(item);

          if (result?.conflict || result?.hasConflict) {
            // Mark item as conflict in state
            const conflictIdx = updatedQueue.findIndex((i) => i.id === item.id);
            if (conflictIdx !== -1) {
              updatedQueue[conflictIdx] = {
                ...item,
                conflict: true,
                serverData: result.serverData || result.data || { updatedAt: new Date().toISOString() },
              };
            }
          } else {
            // Successfully synced
            await removePendingAction(item.id);
          }
        } catch (err) {
          console.error(`Sync error for action ${item.id} (${item.type}):`, err);

          // Check if error status is 409 Conflict
          if (err?.response?.status === 409 || err?.status === 409) {
            const conflictIdx = updatedQueue.findIndex((i) => i.id === item.id);
            if (conflictIdx !== -1) {
              updatedQueue[conflictIdx] = {
                ...item,
                conflict: true,
                serverData: err?.response?.data?.serverData || {
                  updatedAt: new Date().toISOString(),
                  note: 'Server state has updated since your last cached version.',
                },
              };
            }
          }
        }
      }

      await clearSyncedActions();
      setLastSyncedAt(new Date().toISOString());
    } catch (globalErr) {
      console.error('Global sync execution failed:', globalErr);
    } finally {
      await refreshPendingQueue();
      setIsSyncing(false);
      syncInProgressRef.current = false;
    }
  }, [refreshPendingQueue]);

  /**
   * Resolve a conflicting item in the pending queue
   * @param {string} actionId - ID of action to resolve
   * @param {string} strategy - 'keep_server' | 'keep_mine' | 'merge'
   * @param {Object} customMergedPayload - Optional custom payload for 'merge'
   */
  const resolveConflict = useCallback(
    async (actionId, strategy, customMergedPayload = null) => {
      try {
        const queue = await getPendingActions();
        const targetItem = queue.find((i) => i.id === actionId);

        if (!targetItem) {
          await removePendingAction(actionId);
          await refreshPendingQueue();
          return;
        }

        if (strategy === 'keep_server') {
          // Discard local offline change
          await removePendingAction(actionId);
        } else if (strategy === 'keep_mine') {
          // Force execute local change with override flag
          await executeAction({
            ...targetItem,
            payload: { ...targetItem.payload, forceOverwrite: true },
          });
          await removePendingAction(actionId);
        } else if (strategy === 'merge') {
          // Use merged payload and execute
          const mergedPayload = customMergedPayload || {
            ...targetItem.serverData,
            ...targetItem.payload,
            isMerged: true,
          };
          await executeAction({
            ...targetItem,
            payload: mergedPayload,
          });
          await removePendingAction(actionId);
        }

        setLastSyncedAt(new Date().toISOString());
        await refreshPendingQueue();
      } catch (err) {
        console.error(`Failed to resolve conflict for action ${actionId}:`, err);
        throw err;
      }
    },
    [refreshPendingQueue]
  );

  return {
    networkStatus,
    pendingCount: pendingQueue.length,
    pendingQueue,
    isSyncing,
    lastSyncedAt,
    syncNow,
    resolveConflict,
    addOfflineAction,
    refreshPendingQueue,
  };
}

export default useOfflineSync;
