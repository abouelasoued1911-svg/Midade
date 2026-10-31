import { describe, it, expect } from 'vitest';
import { calculateNextSchedule } from './ankiAlgorithm';
import { Card } from '../types';

describe('SM-2 SRS Algorithm', () => {
  const baseCard: Card = {
    id: 'test-card-1',
    userId: 'user-1',
    deckId: 'deck-1',
    front: 'Test Front',
    back: 'Test Back',
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

  it('transitions a new card to learning on Again (Rating 1)', () => {
    const res = calculateNextSchedule(baseCard, 1, 'en');
    expect(res.newCard.state).toBe('learning');
    expect(res.newCard.repetitions).toBe(0);
    expect(res.newCard.lapses).toBe(1);
    expect(res.nextInterval.label).toContain('min');
  });

  it('schedules a new card for step 1 on Good (Rating 3)', () => {
    const res = calculateNextSchedule(baseCard, 3, 'en');
    expect(res.newCard.state).toBe('learning');
    expect(res.newCard.stepIndex).toBe(1);
  });

  it('graduates a new card to review on Easy (Rating 4)', () => {
    const res = calculateNextSchedule(baseCard, 4, 'en');
    expect(res.newCard.state).toBe('review');
    expect(res.newCard.interval).toBe(4);
    expect(res.newCard.repetitions).toBe(1);
  });

  it('adjusts ease factor downward on Hard (Rating 2)', () => {
    const reviewCard: Card = {
      ...baseCard,
      state: 'review',
      interval: 10,
      easeFactor: 2.5,
      repetitions: 3,
    };
    const res = calculateNextSchedule(reviewCard, 2, 'en');
    expect(res.newCard.easeFactor).toBeLessThan(2.5);
    expect(res.newCard.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('multiplies interval by ease factor on Good (Rating 3)', () => {
    const reviewCard: Card = {
      ...baseCard,
      state: 'review',
      interval: 10,
      easeFactor: 2.5,
      repetitions: 3,
    };
    const res = calculateNextSchedule(reviewCard, 3, 'en');
    expect(res.newCard.interval).toBe(25);
    expect(res.newCard.repetitions).toBe(4);
  });
});
