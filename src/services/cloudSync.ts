import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, isFirebaseConfigured } from '../firebase';
import { Card, Deck, ReviewLog, Tombstone } from '../types';
import {
  getLocalCards,
  getLocalDecks,
  getLocalReviews,
  getLocalTombstones,
  getLastSyncTime,
  saveLocalCards,
  saveLocalDecks,
  saveLocalReviews,
  saveLocalTombstones,
  setLastSyncTime,
  getPendingReviewDeletions,
  clearPendingReviewDeletions,
} from './storage';

export const CHUNK_SIZE = 400; // Well within Firestore's 500-operation limit

export interface SyncResult {
  success: boolean;
  decksUploaded: number;
  decksDownloaded: number;
  cardsUploaded: number;
  cardsDownloaded: number;
  reviewsUploaded: number;
  reviewsDownloaded: number;
  tombstonesProcessed: number;
  error?: string;
  syncedAt: string;
}

// Mutex lock to prevent overlapping or concurrent sync operations
let activeSyncPromise: Promise<SyncResult> | null = null;

/**
 * Splits an array into chunks of a given maximum size.
 */
export function chunkArray<T>(items: T[], size: number = CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Commits a batch operation across multiple chunks safely.
 * Returns true only if all chunks commit successfully.
 */
export async function commitChunkedOperations<T>(
  items: T[],
  operation: (batch: ReturnType<typeof writeBatch>, item: T) => void
): Promise<boolean> {
  if (items.length === 0 || !db) return true;
  const chunks = chunkArray(items, CHUNK_SIZE);

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    for (const item of chunk) {
      operation(batch, item);
    }
    await batch.commit();
  }
  return true;
}

/**
 * Synchronizes local decks, cards, reviews, and tombstones with Firebase Firestore.
 * Handles deletions bi-directionally to prevent deleted items from being resurrected.
 * Fully processes all items regardless of count (e.g. 50, 400, 1000+).
 * Protected by a mutex lock to prevent concurrent races.
 */
export function performCloudSync(): Promise<SyncResult> {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = executeCloudSyncInternal().finally(() => {
    activeSyncPromise = null;
  });

  return activeSyncPromise;
}

async function executeCloudSyncInternal(): Promise<SyncResult> {
  const currentUser = auth?.currentUser;
  const now = new Date().toISOString();

  if (!currentUser) {
    return {
      success: false,
      decksUploaded: 0,
      decksDownloaded: 0,
      cardsUploaded: 0,
      cardsDownloaded: 0,
      reviewsUploaded: 0,
      reviewsDownloaded: 0,
      tombstonesProcessed: 0,
      error: 'تسجيل الدخول مطلوب للمزامنة السحابية (Authentication required).',
      syncedAt: now,
    };
  }

  const userId = currentUser.uid;

  if (!isFirebaseConfigured() || !db) {
    return {
      success: false,
      decksUploaded: 0,
      decksDownloaded: 0,
      cardsUploaded: 0,
      cardsDownloaded: 0,
      reviewsUploaded: 0,
      reviewsDownloaded: 0,
      tombstonesProcessed: 0,
      error: 'إعدادات Firebase غير مكتملة. التطبيق يعمل في الوضع المحلي الكامل.',
      syncedAt: getLastSyncTime(userId) || now,
    };
  }

  let decksUploaded = 0;
  let decksDownloaded = 0;
  let cardsUploaded = 0;
  let cardsDownloaded = 0;
  let reviewsUploaded = 0;
  let reviewsDownloaded = 0;
  let tombstonesProcessed = 0;

  try {
    // 1. Sync User Profile in Firestore
    const userRef = doc(db, 'users', userId);
    try {
      await setDoc(
        userRef,
        {
          userId,
          email: currentUser.email || '',
          displayName: currentUser.displayName || 'MIDADE User',
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
    }

    // 2. Fetch and Reconcile Tombstones (Deletions)
    const localTombstones = getLocalTombstones(userId);
    const tombstonesCollection = collection(db, 'tombstones');
    let remoteTombstones: Tombstone[] = [];

    try {
      const tombQuery = query(tombstonesCollection, where('userId', '==', userId));
      const tombSnap = await getDocs(tombQuery);
      remoteTombstones = tombSnap.docs.map((d) => d.data() as Tombstone);
    } catch (err) {
      console.warn('Could not list remote tombstones, continuing local reconciliation:', err);
    }

    const tombstoneMap = new Map<string, Tombstone>();
    for (const rt of remoteTombstones) {
      tombstoneMap.set(rt.id, rt);
    }
    const tombstonesToUpload: Tombstone[] = [];
    for (const lt of localTombstones) {
      if (!tombstoneMap.has(lt.id)) {
        tombstoneMap.set(lt.id, lt);
        tombstonesToUpload.push(lt);
      }
    }

    // Upload pending local tombstones in chunks of 400
    if (tombstonesToUpload.length > 0) {
      try {
        await commitChunkedOperations(tombstonesToUpload, (batch, t) => {
          const ref = doc(db!, 'tombstones', t.id);
          batch.set(ref, { ...t, userId }, { merge: true });
        });
      } catch (err) {
        console.warn('Tombstones upload error:', err);
      }
    }

    const allTombstones = Array.from(tombstoneMap.values());
    saveLocalTombstones(allTombstones, userId);
    const deletedIds = new Set(allTombstones.map((t) => t.id));

    // 3. Process Pending Review Deletions (Undo Review support)
    const pendingReviewDels = getPendingReviewDeletions(userId);
    if (pendingReviewDels.length > 0) {
      try {
        await commitChunkedOperations(pendingReviewDels, (batch, logId) => {
          batch.delete(doc(db!, 'reviewLogs', logId));
        });
        clearPendingReviewDeletions(userId);
      } catch (e) {
        console.warn('Pending review deletions sync note:', e);
      }
    }

    // 4. Sync Decks
    const localDecks = getLocalDecks(userId);
    const decksCollection = collection(db, 'decks');
    let remoteDecks: Deck[] = [];

    try {
      const decksQuery = query(decksCollection, where('userId', '==', userId));
      const deckSnap = await getDocs(decksQuery);
      remoteDecks = deckSnap.docs.map((d) => d.data() as Deck);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'decks');
    }

    const remoteDecksToDelete: string[] = [];
    const mergedDecksMap = new Map<string, Deck>();

    // Process remote decks
    for (const rDeck of remoteDecks) {
      if (deletedIds.has(rDeck.id)) {
        remoteDecksToDelete.push(rDeck.id);
        tombstonesProcessed++;
      } else {
        mergedDecksMap.set(rDeck.id, rDeck);
      }
    }

    // Delete remote decks that have been marked deleted (in chunks of 400)
    if (remoteDecksToDelete.length > 0) {
      try {
        await commitChunkedOperations(remoteDecksToDelete, (batch, dId) => {
          batch.delete(doc(db!, 'decks', dId));
        });
      } catch (e) {
        console.warn('Failed to delete remote tombstoned decks', e);
      }
    }

    const decksToUpload: Deck[] = [];

    // Filter local decks that were deleted on another device
    for (const lDeck of localDecks) {
      if (deletedIds.has(lDeck.id)) {
        continue; // drop locally
      }

      const ownedDeck = { ...lDeck, userId };
      const remote = mergedDecksMap.get(lDeck.id);

      if (!remote) {
        mergedDecksMap.set(lDeck.id, ownedDeck);
        decksToUpload.push(ownedDeck);
        decksUploaded++;
      } else {
        const localTime = new Date(lDeck.updatedAt || 0).getTime();
        const remoteTime = new Date(remote.updatedAt || 0).getTime();

        if (localTime > remoteTime) {
          mergedDecksMap.set(lDeck.id, ownedDeck);
          decksToUpload.push(ownedDeck);
          decksUploaded++;
        } else if (remoteTime > localTime) {
          decksDownloaded++;
        }
      }
    }

    // Upload updated decks in chunks of 400
    if (decksToUpload.length > 0) {
      try {
        await commitChunkedOperations(decksToUpload, (batch, d) => {
          const ref = doc(db!, 'decks', d.id);
          batch.set(ref, d, { merge: true });
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'decks');
      }
    }

    const finalDecks = Array.from(mergedDecksMap.values());
    saveLocalDecks(finalDecks, userId);

    // 5. Sync Cards
    const localCards = getLocalCards(userId);
    const cardsCollection = collection(db, 'cards');
    let remoteCards: Card[] = [];

    try {
      const cardsQuery = query(cardsCollection, where('userId', '==', userId));
      const cardSnap = await getDocs(cardsQuery);
      remoteCards = cardSnap.docs.map((c) => c.data() as Card);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'cards');
    }

    const remoteCardsToDelete: string[] = [];
    const mergedCardsMap = new Map<string, Card>();

    for (const rCard of remoteCards) {
      if (deletedIds.has(rCard.id) || deletedIds.has(rCard.deckId)) {
        remoteCardsToDelete.push(rCard.id);
        tombstonesProcessed++;
      } else {
        mergedCardsMap.set(rCard.id, rCard);
      }
    }

    // Delete remote tombstoned cards in chunks of 400
    if (remoteCardsToDelete.length > 0) {
      try {
        await commitChunkedOperations(remoteCardsToDelete, (batch, cardId) => {
          batch.delete(doc(db!, 'cards', cardId));
        });
      } catch (e) {
        console.warn('Failed to delete remote tombstoned cards chunk', e);
      }
    }

    const cardsToUpload: Card[] = [];

    for (const lCard of localCards) {
      if (deletedIds.has(lCard.id) || deletedIds.has(lCard.deckId)) {
        continue;
      }

      const ownedCard = { ...lCard, userId };
      const remote = mergedCardsMap.get(lCard.id);

      if (!remote) {
        mergedCardsMap.set(lCard.id, ownedCard);
        cardsToUpload.push(ownedCard);
        cardsUploaded++;
      } else {
        const localTime = new Date(lCard.updatedAt || 0).getTime();
        const remoteTime = new Date(remote.updatedAt || 0).getTime();

        if (localTime > remoteTime) {
          mergedCardsMap.set(lCard.id, ownedCard);
          cardsToUpload.push(ownedCard);
          cardsUploaded++;
        } else if (remoteTime > localTime) {
          cardsDownloaded++;
        }
      }
    }

    // Upload newer cards in chunks of 400 (handles any number of cards)
    if (cardsToUpload.length > 0) {
      try {
        await commitChunkedOperations(cardsToUpload, (batch, card) => {
          const ref = doc(db!, 'cards', card.id);
          batch.set(ref, card, { merge: true });
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'cards');
      }
    }

    const finalCards = Array.from(mergedCardsMap.values());
    saveLocalCards(finalCards, userId);

    // 6. Sync Review Logs (Bi-directional, chunked, no artificial limits)
    const localReviews = getLocalReviews(userId);
    const reviewsCollection = collection(db, 'reviewLogs');
    let remoteReviews: ReviewLog[] = [];

    try {
      const reviewQuery = query(reviewsCollection, where('userId', '==', userId));
      const revSnap = await getDocs(reviewQuery);
      remoteReviews = revSnap.docs.map((d) => d.data() as ReviewLog);
    } catch (err) {
      console.warn('Could not list remote reviews, proceeding with local upload:', err);
    }

    const mergedReviewsMap = new Map<string, ReviewLog>();
    for (const r of remoteReviews) {
      mergedReviewsMap.set(r.id, r);
    }

    const reviewsToUpload: ReviewLog[] = [];
    for (const lRev of localReviews) {
      const owned = { ...lRev, userId };
      if (!mergedReviewsMap.has(lRev.id)) {
        mergedReviewsMap.set(lRev.id, owned);
        reviewsToUpload.push(owned);
        reviewsUploaded++;
      }
    }

    reviewsDownloaded = Math.max(0, remoteReviews.length - (localReviews.length - reviewsToUpload.length));

    // Upload in chunks of 400 (ALL reviews uploaded regardless of count)
    if (reviewsToUpload.length > 0) {
      try {
        await commitChunkedOperations(reviewsToUpload, (batch, log) => {
          const ref = doc(db!, 'reviewLogs', log.id);
          batch.set(ref, log, { merge: true });
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'reviewLogs');
      }
    }

    const finalReviews = Array.from(mergedReviewsMap.values());
    saveLocalReviews(finalReviews, userId);

    setLastSyncTime(now, userId);

    return {
      success: true,
      decksUploaded,
      decksDownloaded,
      cardsUploaded,
      cardsDownloaded,
      reviewsUploaded,
      reviewsDownloaded,
      tombstonesProcessed,
      syncedAt: now,
    };
  } catch (error: any) {
    console.warn('Cloud Sync network state:', error?.message || error);
    const isNetworkUnavailable =
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      error?.message?.includes('unavailable') ||
      error?.message?.includes('the client is offline') ||
      error?.message?.includes('network');

    return {
      success: false,
      decksUploaded,
      decksDownloaded,
      cardsUploaded,
      cardsDownloaded,
      reviewsUploaded,
      reviewsDownloaded,
      tombstonesProcessed,
      error: isNetworkUnavailable
        ? 'أنت في وضع عدم الاتصال حالياً. تم حفظ بياناتك محلياً وستتم المزامنة تلقائياً عند الاتصال بالإنترنت.'
        : error?.message || 'فشلت المزامنة السحابية مؤقتاً',
      syncedAt: getLastSyncTime(userId) || now,
    };
  }
}
