import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLocalTombstones,
  saveLocalTombstones,
  addLocalTombstone,
  removeLocalTombstone,
} from './storage';

// Memory storage mock for Node environment tests
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

describe('Tombstone Synchronization Engine', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('records a new tombstone on item deletion', () => {
    addLocalTombstone('card-123', 'card', 'user-1');
    const tombstones = getLocalTombstones('user-1');
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0].id).toBe('card-123');
    expect(tombstones[0].type).toBe('card');
    expect(tombstones[0].userId).toBe('user-1');
  });

  it('updates deletedAt if the same tombstone is registered again', () => {
    addLocalTombstone('deck-456', 'deck', 'user-1');
    addLocalTombstone('deck-456', 'deck', 'user-1');
    const tombstones = getLocalTombstones('user-1');
    expect(tombstones).toHaveLength(1);
  });

  it('removes a tombstone when explicitly cleared', () => {
    addLocalTombstone('card-999', 'card', 'user-1');
    expect(getLocalTombstones('user-1')).toHaveLength(1);
    removeLocalTombstone('card-999', 'user-1');
    expect(getLocalTombstones('user-1')).toHaveLength(0);
  });

  it('prunes tombstones older than 90 days', () => {
    const expiredDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString();
    const freshDate = new Date().toISOString();

    saveLocalTombstones([
      { id: 'old-tomb', type: 'card', userId: 'user-1', deletedAt: expiredDate },
      { id: 'fresh-tomb', type: 'card', userId: 'user-1', deletedAt: freshDate },
    ], 'user-1');

    const result = getLocalTombstones('user-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('fresh-tomb');
  });
});
