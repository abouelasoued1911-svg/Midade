import { MediaItem } from '../types';

const DB_NAME = 'midade_offline_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not available in current environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('decks')) {
        const deckStore = db.createObjectStore('decks', { keyPath: 'id' });
        deckStore.createIndex('userId', 'userId', { unique: false });
      } else {
        const deckStore = request.transaction?.objectStore('decks');
        if (deckStore && !deckStore.indexNames.contains('userId')) {
          deckStore.createIndex('userId', 'userId', { unique: false });
        }
      }

      if (!db.objectStoreNames.contains('cards')) {
        const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
        cardStore.createIndex('deckId', 'deckId', { unique: false });
        cardStore.createIndex('userId', 'userId', { unique: false });
        cardStore.createIndex('state', 'state', { unique: false });
      } else {
        const cardStore = request.transaction?.objectStore('cards');
        if (cardStore && !cardStore.indexNames.contains('userId')) {
          cardStore.createIndex('userId', 'userId', { unique: false });
        }
      }

      if (!db.objectStoreNames.contains('reviews')) {
        const reviewStore = db.createObjectStore('reviews', { keyPath: 'id' });
        reviewStore.createIndex('userId', 'userId', { unique: false });
        reviewStore.createIndex('cardId', 'cardId', { unique: false });
      } else {
        const reviewStore = request.transaction?.objectStore('reviews');
        if (reviewStore && !reviewStore.indexNames.contains('userId')) {
          reviewStore.createIndex('userId', 'userId', { unique: false });
        }
      }

      if (!db.objectStoreNames.contains('tombstones')) {
        const tombStore = db.createObjectStore('tombstones', { keyPath: 'id' });
        tombStore.createIndex('userId', 'userId', { unique: false });
      }

      if (!db.objectStoreNames.contains('media')) {
        db.createObjectStore('media', { keyPath: 'filename' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.warn('IndexedDB open failed, falling back to localStorage:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Generic helper to get all items from an object store, optionally filtered by userId.
 */
export async function idbGetAll<T extends { userId?: string }>(storeName: string, userId?: string): Promise<T[]> {
  if (typeof window === 'undefined' || !window.indexedDB) return [];
  try {
    const db = await getDb();
    return new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);

      if (userId && store.indexNames.contains('userId')) {
        const index = store.index('userId');
        const req = index.getAll(userId);
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error);
      } else {
        const req = store.getAll();
        req.onsuccess = () => {
          const all = req.result as T[];
          if (userId) {
            resolve(all.filter((item) => (item.userId || 'local') === userId));
          } else {
            resolve(all);
          }
        };
        req.onerror = () => reject(req.error);
      }
    });
  } catch (err) {
    console.warn(`IndexedDB getAll on ${storeName} failed:`, err);
    return [];
  }
}

/**
 * Stores items for a specific user without affecting other users' records.
 */
export async function idbPutAll<T extends { id: string; userId?: string }>(
  storeName: string,
  items: T[],
  userId?: string
): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return;
  try {
    const db = await getDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      if (userId && store.indexNames.contains('userId')) {
        const index = store.index('userId');
        const keyReq = index.getAllKeys(userId);
        keyReq.onsuccess = () => {
          const keys = keyReq.result;
          for (const k of keys) {
            store.delete(k);
          }
          for (const item of items) {
            store.put({ ...item, userId });
          }
        };
        keyReq.onerror = () => {
          for (const item of items) {
            store.put(item);
          }
        };
      } else {
        for (const item of items) {
          store.put(item);
        }
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`IndexedDB putAll on ${storeName} failed:`, err);
  }
}

/**
 * Saves a media item (image or audio) into IndexedDB
 */
export async function idbSaveMedia(filename: string, dataUrl: string, mimeType: string): Promise<void> {
  try {
    const db = await getDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('media', 'readwrite');
      const store = tx.objectStore('media');
      const item: MediaItem = {
        id: filename,
        filename,
        dataUrl,
        mimeType,
        size: dataUrl.length,
        createdAt: new Date().toISOString(),
      };
      store.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save media failed:', err);
  }
}

/**
 * Retrieves a media item from IndexedDB
 */
export async function idbGetMedia(filename: string): Promise<string | null> {
  try {
    const db = await getDb();
    return new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction('media', 'readonly');
      const store = tx.objectStore('media');
      const req = store.get(filename);
      req.onsuccess = () => {
        const res = req.result as MediaItem | undefined;
        resolve(res ? res.dataUrl : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}
