import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLocalDecks,
  saveLocalDecks,
  getLocalCards,
  saveLocalCards,
  getLocalReviews,
  saveLocalReviews,
  getLocalTombstones,
  addLocalTombstone,
  getUserStorageKey,
} from './storage';
import { Deck, Card, ReviewLog } from '../types';

// Mock localStorage in test environment
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true,
});

describe('Multi-User Storage Partitioning and Isolation', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('generates distinct storage keys for distinct users', () => {
    const keyUser1 = getUserStorageKey('midade_decks_v2', 'user_A');
    const keyUser2 = getUserStorageKey('midade_decks_v2', 'user_B');
    const keyLocal = getUserStorageKey('midade_decks_v2', 'local');

    expect(keyUser1).toBe('midade_decks_v2_user_A');
    expect(keyUser2).toBe('midade_decks_v2_user_B');
    expect(keyLocal).toBe('midade_decks_v2_local');
    expect(keyUser1).not.toBe(keyUser2);
  });

  it('ensures User A cannot see User B decks on the same device', () => {
    const deckUserA: Deck = {
      id: 'deck-a-1',
      userId: 'user_A',
      name: "User A's Secret Deck",
      newCardsPerDay: 20,
      reviewCardsPerDay: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const deckUserB: Deck = {
      id: 'deck-b-1',
      userId: 'user_B',
      name: "User B's Private Deck",
      newCardsPerDay: 15,
      reviewCardsPerDay: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveLocalDecks([deckUserA], 'user_A');
    saveLocalDecks([deckUserB], 'user_B');

    const loadedA = getLocalDecks('user_A');
    const loadedB = getLocalDecks('user_B');

    expect(loadedA).toHaveLength(1);
    expect(loadedA[0].name).toBe("User A's Secret Deck");

    expect(loadedB).toHaveLength(1);
    expect(loadedB[0].name).toBe("User B's Private Deck");

    // Guest / local user has no access to either user's decks
    const loadedGuest = getLocalDecks('local');
    expect(loadedGuest.some((d) => d.id === 'deck-a-1')).toBe(false);
    expect(loadedGuest.some((d) => d.id === 'deck-b-1')).toBe(false);
  });

  it('ensures User A cannot see User B cards or review history', () => {
    const cardA: Card = {
      id: 'card-a-1',
      userId: 'user_A',
      deckId: 'deck-a-1',
      front: 'Question A',
      back: 'Answer A',
      cardType: 'basic',
      state: 'new',
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      dueDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const reviewA: ReviewLog = {
      id: 'rev-a-1',
      userId: 'user_A',
      cardId: 'card-a-1',
      deckId: 'deck-a-1',
      rating: 3,
      reviewedAt: new Date().toISOString(),
      timeSpentSeconds: 10,
    };

    saveLocalCards([cardA], 'user_A');
    saveLocalReviews([reviewA], 'user_A');

    const cardsForB = getLocalCards('user_B');
    const reviewsForB = getLocalReviews('user_B');

    expect(cardsForB).toHaveLength(0);
    expect(reviewsForB).toHaveLength(0);

    const cardsForA = getLocalCards('user_A');
    expect(cardsForA).toHaveLength(1);
    expect(cardsForA[0].id).toBe('card-a-1');
  });

  it('preserves user data upon logout without deleting partition', () => {
    const deckUserA: Deck = {
      id: 'deck-a-persist',
      userId: 'user_A',
      name: 'Persistent Deck',
      newCardsPerDay: 20,
      reviewCardsPerDay: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveLocalDecks([deckUserA], 'user_A');

    // Simulate logout: active user becomes 'local'
    const guestDecks = getLocalDecks('local');
    expect(guestDecks.some((d) => d.id === 'deck-a-persist')).toBe(false);

    // Simulate logging back in as User A
    const restoredA = getLocalDecks('user_A');
    expect(restoredA).toHaveLength(1);
    expect(restoredA[0].id).toBe('deck-a-persist');
  });

  it('keeps deletion tombstones isolated per user', () => {
    addLocalTombstone('card-1', 'card', 'user_A');
    addLocalTombstone('card-2', 'card', 'user_B');

    const tombstonesA = getLocalTombstones('user_A');
    const tombstonesB = getLocalTombstones('user_B');

    expect(tombstonesA).toHaveLength(1);
    expect(tombstonesA[0].id).toBe('card-1');

    expect(tombstonesB).toHaveLength(1);
    expect(tombstonesB[0].id).toBe('card-2');
  });
});
