/**
 * client/src/utils/offlineStore.js
 * Lightweight IndexedDB store using raw IndexedDB API.
 * Stores:
 *   - pendingActions: { id, type, ticketId, payload, cachedUpdatedAt, createdAt, synced }
 *   - cachedPhotos:   { id, ticketId, phase, dataUrl, caption, timestamp }
 */

const DB_NAME = 'TenantPortalOfflineDB';
const DB_VERSION = 1;

let dbPromise = null;

export const openDB = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      console.warn('IndexedDB is not supported in this browser environment.');
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Pending actions store
      if (!db.objectStoreNames.contains('pendingActions')) {
        const actionStore = db.createObjectStore('pendingActions', { keyPath: 'id' });
        actionStore.createIndex('ticketId', 'ticketId', { unique: false });
        actionStore.createIndex('synced', 'synced', { unique: false });
        actionStore.createIndex('type', 'type', { unique: false });
        actionStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Cached photos store
      if (!db.objectStoreNames.contains('cachedPhotos')) {
        const photoStore = db.createObjectStore('cachedPhotos', { keyPath: 'id' });
        photoStore.createIndex('ticketId', 'ticketId', { unique: false });
        photoStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
};

/**
 * Add a pending action to the IndexedDB store
 * @param {Object} action - Action details
 */
export const addPendingAction = async (action) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingActions', 'readwrite');
    const store = tx.objectStore('pendingActions');

    const item = {
      id: action.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: action.type || 'generic',
      ticketId: action.ticketId || null,
      payload: action.payload || {},
      cachedUpdatedAt: action.cachedUpdatedAt || new Date().toISOString(),
      createdAt: action.createdAt || new Date().toISOString(),
      synced: false,
      error: action.error || null,
    };

    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = (e) => reject(e.target.error);
  });
};

/**
 * Get all unsynced pending actions
 */
export const getPendingActions = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingActions', 'readonly');
    const store = tx.objectStore('pendingActions');
    const req = store.getAll();

    req.onsuccess = () => {
      const all = req.result || [];
      // Return unsynced actions sorted by createdAt
      const pending = all
        .filter((item) => !item.synced)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      resolve(pending);
    };
    req.onerror = (e) => reject(e.target.error);
  });
};

/**
 * Remove a specific pending action by ID
 */
export const removePendingAction = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingActions', 'readwrite');
    const store = tx.objectStore('pendingActions');
    const req = store.delete(id);

    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
};

/**
 * Clear all synced actions from the store
 */
export const clearSyncedActions = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingActions', 'readwrite');
    const store = tx.objectStore('pendingActions');
    const req = store.getAll();

    req.onsuccess = () => {
      const items = req.result || [];
      items.forEach((item) => {
        if (item.synced) {
          store.delete(item.id);
        }
      });
      resolve(true);
    };
    req.onerror = (e) => reject(e.target.error);
  });
};

/**
 * Mark a pending action as synced
 */
export const markActionSynced = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingActions', 'readwrite');
    const store = tx.objectStore('pendingActions');
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const item = getReq.result;
      if (item) {
        item.synced = true;
        item.syncedAt = new Date().toISOString();
        const putReq = store.put(item);
        putReq.onsuccess = () => resolve(item);
        putReq.onerror = (e) => reject(e.target.error);
      } else {
        resolve(null);
      }
    };
    getReq.onerror = (e) => reject(e.target.error);
  });
};

/**
 * Save a photo to cachedPhotos object store
 */
export const saveCachedPhoto = async (photoData) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cachedPhotos', 'readwrite');
    const store = tx.objectStore('cachedPhotos');

    const item = {
      id: photoData.id || `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ticketId: photoData.ticketId,
      phase: photoData.phase || 'during',
      dataUrl: photoData.dataUrl || photoData.url,
      caption: photoData.caption || '',
      createdAt: photoData.createdAt || new Date().toISOString(),
    };

    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = (e) => reject(e.target.error);
  });
};

/**
 * Get all cached photos for a specific ticket
 */
export const getCachedPhotos = async (ticketId) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cachedPhotos', 'readonly');
    const store = tx.objectStore('cachedPhotos');
    const req = store.getAll();

    req.onsuccess = () => {
      const all = req.result || [];
      const filtered = ticketId ? all.filter((p) => p.ticketId === ticketId) : all;
      resolve(filtered);
    };
    req.onerror = (e) => reject(e.target.error);
  });
};

/**
 * Remove a cached photo by ID
 */
export const removeCachedPhoto = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cachedPhotos', 'readwrite');
    const store = tx.objectStore('cachedPhotos');
    const req = store.delete(id);

    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
};

/**
 * Clear all offline data
 */
export const clearAllOfflineData = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['pendingActions', 'cachedPhotos'], 'readwrite');
    tx.objectStore('pendingActions').clear();
    tx.objectStore('cachedPhotos').clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
};

export default {
  openDB,
  addPendingAction,
  getPendingActions,
  removePendingAction,
  clearSyncedActions,
  markActionSynced,
  saveCachedPhoto,
  getCachedPhotos,
  removeCachedPhoto,
  clearAllOfflineData,
};
