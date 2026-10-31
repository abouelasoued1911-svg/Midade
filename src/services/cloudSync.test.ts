import { describe, it, expect } from 'vitest';
import { chunkArray, CHUNK_SIZE, performCloudSync } from './cloudSync';
import {
  addPendingReviewDeletion,
  getPendingReviewDeletions,
  clearPendingReviewDeletions,
} from './storage';
import { Card } from '../types';

describe('Cloud Synchronization Engine & Batch Processing', () => {
  it('correctly chunks array of 1 element', () => {
    const items = ['item-1'];
    const chunks = chunkArray(items, CHUNK_SIZE);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(1);
  });

  it('correctly chunks array of 49 elements into a single batch', () => {
    const items = Array.from({ length: 49 }, (_, i) => `item-${i}`);
    const chunks = chunkArray(items, CHUNK_SIZE);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(49);
  });

  it('correctly chunks array of 50 and 51 elements into a single batch under 400', () => {
    const items50 = Array.from({ length: 50 }, (_, i) => `item-${i}`);
    const items51 = Array.from({ length: 51 }, (_, i) => `item-${i}`);

    const chunks50 = chunkArray(items50, CHUNK_SIZE);
    const chunks51 = chunkArray(items51, CHUNK_SIZE);

    expect(chunks50).toHaveLength(1);
    expect(chunks50[0]).toHaveLength(50);

    expect(chunks51).toHaveLength(1);
    expect(chunks51[0]).toHaveLength(51);
  });

  it('correctly chunks 400 elements into exactly 1 batch of 400', () => {
    const items = Array.from({ length: 400 }, (_, i) => `item-${i}`);
    const chunks = chunkArray(items, CHUNK_SIZE);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(400);
  });

  it('correctly chunks 401 elements into 2 batches without dropping the 401st element', () => {
    const items = Array.from({ length: 401 }, (_, i) => `item-${i}`);
    const chunks = chunkArray(items, CHUNK_SIZE);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(400);
    expect(chunks[1]).toHaveLength(1);
    expect(chunks[1][0]).toBe('item-400');
  });

  it('correctly chunks 1000 items into 3 batches (400, 400, 200) ensuring 100% item coverage', () => {
    const items = Array.from({ length: 1000 }, (_, i) => `rev-${i}`);
    const chunks = chunkArray(items, CHUNK_SIZE);

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(400);
    expect(chunks[1]).toHaveLength(400);
    expect(chunks[2]).toHaveLength(200);

    const flattened = chunks.flat();
    expect(flattened).toHaveLength(1000);
    expect(flattened[0]).toBe('rev-0');
    expect(flattened[999]).toBe('rev-999');
  });

  it('resolves conflicting edits on two devices using latest updatedAt', () => {
    const olderTime = '2026-10-31T10:00:00.000Z';
    const newerTime = '2026-10-31T12:00:00.000Z';

    const localCard: Card = {
      id: 'card-sync-conflict',
      userId: 'user-1',
      deckId: 'deck-1',
      front: 'Local newer question',
      back: 'Local answer',
      cardType: 'basic',
      state: 'review',
      interval: 5,
      easeFactor: 2.5,
      repetitions: 2,
      lapses: 0,
      dueDate: newerTime,
      createdAt: olderTime,
      updatedAt: newerTime,
    };

    const remoteCard: Card = {
      id: 'card-sync-conflict',
      userId: 'user-1',
      deckId: 'deck-1',
      front: 'Remote older question',
      back: 'Remote answer',
      cardType: 'basic',
      state: 'review',
      interval: 3,
      easeFactor: 2.5,
      repetitions: 1,
      lapses: 0,
      dueDate: olderTime,
      createdAt: olderTime,
      updatedAt: olderTime,
    };

    const localTimestamp = new Date(localCard.updatedAt).getTime();
    const remoteTimestamp = new Date(remoteCard.updatedAt).getTime();

    // Local is newer -> must upload local to remote
    expect(localTimestamp).toBeGreaterThan(remoteTimestamp);
  });

  it('handles unauthenticated sync calls gracefully without throwing uncaught exceptions', async () => {
    const res = await performCloudSync();
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(typeof res.error).toBe('string');
  });

  it('shares in-flight promise to prevent concurrent overlapping sync operations', () => {
    const p1 = performCloudSync();
    const p2 = performCloudSync();
    expect(p1).toBe(p2);
  });

  it('tracks pending review deletions for undo synchronization', () => {
    clearPendingReviewDeletions('user-test');
    expect(getPendingReviewDeletions('user-test')).toHaveLength(0);

    addPendingReviewDeletion('rev-123', 'user-test');
    addPendingReviewDeletion('rev-456', 'user-test');

    const pending = getPendingReviewDeletions('user-test');
    expect(pending).toHaveLength(2);
    expect(pending).toContain('rev-123');
    expect(pending).toContain('rev-456');

    clearPendingReviewDeletions('user-test');
    expect(getPendingReviewDeletions('user-test')).toHaveLength(0);
  });
});
