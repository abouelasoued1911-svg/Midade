import { Card, Deck, DeckCounts, ReviewLog, Tombstone, UserProfile } from '../types';
import { INITIAL_CARDS, INITIAL_DECKS } from './starterDecks';
import { idbGetAll, idbPutAll } from './indexedDb';

const BASE_KEYS = {
  DECKS: 'midade_decks_v2',
  CARDS: 'midade_cards_v2',
  REVIEWS: 'midade_reviews_v2',
  TOMBSTONES: 'midade_tombstones_v1',
  SETTINGS: 'midade_settings_v1',
  LAST_SYNC: 'midade_last_sync_v1',
  PENDING_DEL_REVIEWS: 'midade_pending_del_revs_v1',
  LEGACY_DECKS: 'ankidroid_decks_v2',
  LEGACY_CARDS: 'ankidroid_cards_v2',
  LEGACY_REVIEWS: 'ankidroid_reviews_v2',
};

/**
 * Returns a key scoped by user ID to guarantee strict data isolation
 * between different Google accounts on the same device.
 */
export function getUserStorageKey(baseKey: string, userId: string = 'local'): string {
  const cleanUser = (userId || 'local').replace(/[^a-zA-Z0-9_\-]/g, '_');
  return `${baseKey}_${cleanUser}`;
}

// Memory fallback cache in case localStorage is disabled (e.g. private mode restrictions)
const memoryStorage = new Map<string, string>();

function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const item = localStorage.getItem(key);
      if (item !== null) return item;
    }
  } catch {
    // Fall back to memory storage
  }
  return memoryStorage.get(key) || null;
}

function pruneOldCache(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    // Remove expired tombstones or temporary keys to free quota
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.includes('tombstones')) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const list: Tombstone[] = JSON.parse(raw);
          const pruned = list.filter((t) => new Date(t.deletedAt).getTime() > cutoff);
          localStorage.setItem(k, JSON.stringify(pruned));
        }
      }
    }
  } catch {
    // ignore
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
  } catch (e: any) {
    console.warn(`localStorage quota exceeded or blocked for ${key}, attempting recovery:`, e);
    try {
      pruneOldCache();
      localStorage.setItem(key, value);
      return;
    } catch {
      console.warn(`localStorage full; relying on IndexedDB persistent mirror for ${key}`);
    }
  }
  memoryStorage.set(key, value);
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
  memoryStorage.delete(key);
}

/* ================= DECKS STORAGE ================= */

export function getLocalDecks(userId: string = 'local'): Deck[] {
  try {
    const userKey = getUserStorageKey(BASE_KEYS.DECKS, userId);
    let raw = safeGetItem(userKey);

    // If local/guest has no data yet, check legacy un-scoped key
    if (!raw && userId === 'local') {
      raw = safeGetItem(BASE_KEYS.DECKS) || safeGetItem(BASE_KEYS.LEGACY_DECKS);
      if (raw) {
        // Migrate to scoped key
        safeSetItem(userKey, raw);
      }
    }

    if (!raw) {
      if (userId === 'local') {
        safeSetItem(userKey, JSON.stringify(INITIAL_DECKS));
        return INITIAL_DECKS;
      }
      return [];
    }

    const parsed: Deck[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error(`Failed to load decks for user ${userId}`, e);
    return userId === 'local' ? INITIAL_DECKS : [];
  }
}

export function saveLocalDecks(decks: Deck[], userId: string = 'local'): void {
  try {
    const userKey = getUserStorageKey(BASE_KEYS.DECKS, userId);
    safeSetItem(userKey, JSON.stringify(decks));
    // Asynchronous IndexedDB mirror
    idbPutAll('decks', decks, userId).catch((err) => console.warn('IDB decks save error:', err));
  } catch (e) {
    console.error(`Failed to save decks for user ${userId}`, e);
  }
}

/* ================= CARDS STORAGE ================= */

export function getLocalCards(userId: string = 'local'): Card[] {
  try {
    const userKey = getUserStorageKey(BASE_KEYS.CARDS, userId);
    let raw = safeGetItem(userKey);

    if (!raw && userId === 'local') {
      raw = safeGetItem(BASE_KEYS.CARDS) || safeGetItem(BASE_KEYS.LEGACY_CARDS);
      if (raw) {
        safeSetItem(userKey, raw);
      }
    }

    if (!raw) {
      if (userId === 'local') {
        safeSetItem(userKey, JSON.stringify(INITIAL_CARDS));
        return INITIAL_CARDS;
      }
      return [];
    }

    const parsed: Card[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error(`Failed to load cards for user ${userId}`, e);
    return [];
  }
}

export function saveLocalCards(cards: Card[], userId: string = 'local'): void {
  try {
    const userKey = getUserStorageKey(BASE_KEYS.CARDS, userId);
    safeSetItem(userKey, JSON.stringify(cards));
    idbPutAll('cards', cards, userId).catch((err) => console.warn('IDB cards save error:', err));
  } catch (e) {
    console.error(`Failed to save cards for user ${userId}`, e);
  }
}

/* ================= REVIEWS STORAGE ================= */

export function getLocalReviews(userId: string = 'local'): ReviewLog[] {
  try {
    const userKey = getUserStorageKey(BASE_KEYS.REVIEWS, userId);
    let raw = safeGetItem(userKey);

    if (!raw && userId === 'local') {
      raw = safeGetItem(BASE_KEYS.REVIEWS) || safeGetItem(BASE_KEYS.LEGACY_REVIEWS);
      if (raw) {
        safeSetItem(userKey, raw);
      }
    }

    if (!raw) return [];
    const parsed: ReviewLog[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error(`Failed to load review logs for user ${userId}`, e);
    return [];
  }
}

export function saveLocalReviews(reviews: ReviewLog[], userId: string = 'local'): void {
  try {
    const userKey = getUserStorageKey(BASE_KEYS.REVIEWS, userId);
    safeSetItem(userKey, JSON.stringify(reviews));
    idbPutAll('reviews', reviews, userId).catch((err) => console.warn('IDB reviews save error:', err));
  } catch (e) {
    console.error(`Failed to save review logs for user ${userId}`, e);
  }
}

/* ================= TOMBSTONES FOR SYNC ================= */

export function getLocalTombstones(userId: string = 'local'): Tombstone[] {
  try {
    const userKey = getUserStorageKey(BASE_KEYS.TOMBSTONES, userId);
    let raw = safeGetItem(userKey);

    if (!raw && userId === 'local') {
      raw = safeGetItem(BASE_KEYS.TOMBSTONES);
    }

    if (!raw) return [];
    const parsed: Tombstone[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalTombstones(tombstones: Tombstone[], userId: string = 'local'): void {
  try {
    // Keep tombstones up to 90 days to avoid unbounded growth
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const pruned = tombstones.filter((t) => new Date(t.deletedAt).getTime() > cutoff);
    const userKey = getUserStorageKey(BASE_KEYS.TOMBSTONES, userId);
    safeSetItem(userKey, JSON.stringify(pruned));
    idbPutAll('tombstones', pruned, userId).catch(() => {});
  } catch (e) {
    console.error(`Failed to save tombstones for user ${userId}`, e);
  }
}

export function addLocalTombstone(id: string, type: 'card' | 'deck', userId: string = 'local'): void {
  const current = getLocalTombstones(userId);
  const existingIndex = current.findIndex((t) => t.id === id);
  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    current[existingIndex].deletedAt = now;
  } else {
    current.push({ id, type, userId, deletedAt: now });
  }
  saveLocalTombstones(current, userId);
}

export function removeLocalTombstone(id: string, userId: string = 'local'): void {
  const current = getLocalTombstones(userId).filter((t) => t.id !== id);
  saveLocalTombstones(current, userId);
}

/* ================= PENDING REVIEW DELETIONS (UNDO SUPPORT) ================= */

export function addPendingReviewDeletion(logId: string, userId: string = 'local'): void {
  const current = getPendingReviewDeletions(userId);
  if (!current.includes(logId)) {
    current.push(logId);
    safeSetItem(getUserStorageKey(BASE_KEYS.PENDING_DEL_REVIEWS, userId), JSON.stringify(current));
  }
}

export function getPendingReviewDeletions(userId: string = 'local'): string[] {
  try {
    const raw = safeGetItem(getUserStorageKey(BASE_KEYS.PENDING_DEL_REVIEWS, userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearPendingReviewDeletions(userId: string = 'local'): void {
  safeRemoveItem(getUserStorageKey(BASE_KEYS.PENDING_DEL_REVIEWS, userId));
}

/* ================= USER SETTINGS ================= */

export function getLocalSettings(userId: string = 'local'): UserProfile['settings'] {
  try {
    const userKey = getUserStorageKey(BASE_KEYS.SETTINGS, userId);
    const raw = safeGetItem(userKey) || safeGetItem(BASE_KEYS.SETTINGS);
    if (!raw) {
      return {
        theme: 'light',
        language: 'en',
        autoPlayAudio: false,
        showTimer: true,
      };
    }
    return JSON.parse(raw);
  } catch {
    return { theme: 'light', language: 'en', autoPlayAudio: false, showTimer: true };
  }
}

export function saveLocalSettings(settings: UserProfile['settings'], userId: string = 'local'): void {
  try {
    const userKey = getUserStorageKey(BASE_KEYS.SETTINGS, userId);
    safeSetItem(userKey, JSON.stringify(settings));
    // Also update common settings for app theme/lang
    safeSetItem(BASE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function getLastSyncTime(userId: string = 'local'): string | null {
  const userKey = getUserStorageKey(BASE_KEYS.LAST_SYNC, userId);
  return safeGetItem(userKey) || safeGetItem(BASE_KEYS.LAST_SYNC);
}

export function setLastSyncTime(isoTime: string, userId: string = 'local'): void {
  const userKey = getUserStorageKey(BASE_KEYS.LAST_SYNC, userId);
  safeSetItem(userKey, isoTime);
  safeSetItem(BASE_KEYS.LAST_SYNC, isoTime);
}

/**
 * Clean up in-memory session and UI caches when user logs out.
 * Does NOT delete the user's persistent local storage partition.
 */
export function clearUserSessionCache(): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  } catch (e) {
    console.warn('Session storage clear note:', e);
  }
}

/**
 * Initializes and reconciles IndexedDB with localStorage for a given user.
 * Ensures seamless upgrade without any data loss.
 */
export async function initStorageMigration(userId: string = 'local'): Promise<void> {
  try {
    const [idbDecks, idbCards] = await Promise.all([
      idbGetAll<Deck>('decks', userId),
      idbGetAll<Card>('cards', userId),
    ]);

    const localDecks = getLocalDecks(userId);
    const localCards = getLocalCards(userId);

    // If IndexedDB has cards but localStorage was cleared, restore to localStorage
    if (idbCards.length > localCards.length && localCards.length === 0) {
      saveLocalCards(idbCards, userId);
    } else if (localCards.length > 0 && idbCards.length === 0) {
      await idbPutAll('cards', localCards, userId);
    }

    if (idbDecks.length > localDecks.length && localDecks.length === 0) {
      saveLocalDecks(idbDecks, userId);
    } else if (localDecks.length > 0 && idbDecks.length === 0) {
      await idbPutAll('decks', localDecks, userId);
    }
  } catch (e) {
    console.warn('Storage migration note:', e);
  }
}

/* ================= COUNTS & QUEUE HELPERS ================= */

export function calculateDeckCounts(cards: Card[], deckId?: string): DeckCounts {
  const now = new Date().getTime();
  const filtered = deckId
    ? cards.filter((c) => c.deckId === deckId && !c.isSuspended)
    : cards.filter((c) => !c.isSuspended);

  let newCount = 0;
  let learningCount = 0;
  let dueCount = 0;

  for (const card of filtered) {
    if (card.state === 'new') {
      newCount++;
    } else if (card.state === 'learning' || card.state === 'relearning') {
      learningCount++;
    } else if (card.state === 'review') {
      const dueTime = new Date(card.dueDate).getTime();
      if (dueTime <= now) {
        dueCount++;
      }
    }
  }

  return {
    newCount,
    learningCount,
    dueCount,
    totalCards: filtered.length,
  };
}

export function getDeckStudyQueue(cards: Card[], deck: Deck): Card[] {
  const now = new Date().getTime();
  const deckCards = cards.filter((c) => c.deckId === deck.id && !c.isSuspended);

  const learningDue: Card[] = [];
  const reviewDue: Card[] = [];
  const newCards: Card[] = [];

  for (const card of deckCards) {
    if (card.state === 'learning' || card.state === 'relearning') {
      const dueTime = new Date(card.dueDate).getTime();
      if (dueTime <= now) {
        learningDue.push(card);
      }
    } else if (card.state === 'review') {
      const dueTime = new Date(card.dueDate).getTime();
      if (dueTime <= now) {
        reviewDue.push(card);
      }
    } else if (card.state === 'new') {
      newCards.push(card);
    }
  }

  const maxNew = deck.newCardsPerDay || 20;
  const maxReview = deck.reviewCardsPerDay || 100;

  const limitedNew = newCards.slice(0, maxNew);
  const limitedReview = reviewDue.slice(0, maxReview);

  return [...learningDue, ...limitedReview, ...limitedNew];
}
