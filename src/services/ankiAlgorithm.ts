import { Card, ReviewRating } from '../types';
import { SupportedLanguage, TRANSLATIONS } from '../i18n/translations';

export interface NextIntervalInfo {
  intervalDays: number;
  label: string;
  nextDueDate: Date;
}

export function formatIntervalLabel(days: number, langCode: SupportedLanguage = 'en'): string {
  const tIntervals = TRANSLATIONS[langCode]?.intervals || TRANSLATIONS.en.intervals;

  if (days < 1 / (24 * 60)) {
    return tIntervals.lessThanOneMin;
  }
  if (days < 1 / 24) {
    const mins = Math.max(1, Math.round(days * 24 * 60));
    return `${mins} ${tIntervals.minutes}`;
  }
  if (days < 1) {
    const hours = Math.max(1, Math.round(days * 24));
    return `${hours} ${tIntervals.hours}`;
  }
  if (days < 30) {
    const d = Math.round(days);
    return `${d} ${tIntervals.days}`;
  }
  if (days < 365) {
    const months = +(days / 30).toFixed(1);
    return `${months} ${tIntervals.months}`;
  }
  const years = +(days / 365).toFixed(1);
  return `${years} ${tIntervals.years}`;
}

/**
 * Calculates the next schedule for a card given a rating (1=Again, 2=Hard, 3=Good, 4=Easy)
 */
export function calculateNextSchedule(
  card: Card,
  rating: ReviewRating,
  langCode: SupportedLanguage = 'en'
): {
  newCard: Partial<Card>;
  nextInterval: NextIntervalInfo;
} {
  const now = new Date();
  const currentInterval = card.interval || 0;
  const currentEase = card.easeFactor || 2.5;
  const currentState = card.state || 'new';
  const repetitions = card.repetitions || 0;
  const lapses = card.lapses || 0;
  const stepIndex = card.stepIndex || 0;

  let nextIntervalDays = 1;
  let nextEase = currentEase;
  let nextRepetitions = repetitions;
  let nextLapses = lapses;
  let nextState: Card['state'] = currentState;
  let nextStep = stepIndex;

  // New or in learning
  if (currentState === 'new' || currentState === 'learning' || currentState === 'relearning') {
    if (rating === 1) {
      // Again: restart step 0 (1 minute)
      nextIntervalDays = 1 / (24 * 60); // 1 min
      nextState = 'learning';
      nextStep = 0;
      nextLapses += 1;
    } else if (rating === 2) {
      // Hard: intermediate step (6 minutes)
      nextIntervalDays = 6 / (24 * 60);
      nextState = 'learning';
      nextStep = Math.max(0, stepIndex);
    } else if (rating === 3) {
      // Good: step 1 (10 minutes) or graduate to 1 day
      if (stepIndex === 0) {
        nextIntervalDays = 10 / (24 * 60);
        nextState = 'learning';
        nextStep = 1;
      } else {
        // Graduate to review!
        nextIntervalDays = 1;
        nextState = 'review';
        nextRepetitions += 1;
        nextStep = 0;
      }
    } else {
      // Easy: immediately graduate to 4 days
      nextIntervalDays = 4;
      nextState = 'review';
      nextRepetitions += 1;
      nextEase = Math.min(3.0, currentEase + 0.15);
      nextStep = 0;
    }
  } else {
    // Review state (SM-2 Spaced Repetition)
    if (rating === 1) {
      // Again: lapse, relearn
      nextIntervalDays = 10 / (24 * 60); // 10 min
      nextState = 'relearning';
      nextLapses += 1;
      nextEase = Math.max(1.3, currentEase - 0.20);
      nextRepetitions = 0;
      nextStep = 0;
    } else if (rating === 2) {
      // Hard: slight interval growth, decrease ease
      nextIntervalDays = Math.max(1, Math.round(currentInterval * 1.2));
      nextEase = Math.max(1.3, currentEase - 0.15);
      nextState = 'review';
    } else if (rating === 3) {
      // Good: standard SM-2 interval expansion
      const factor = currentInterval === 0 ? 1 : currentInterval;
      nextIntervalDays = Math.max(1, Math.round(factor * currentEase));
      nextState = 'review';
      nextRepetitions += 1;
    } else {
      // Easy: bonus interval and increase ease
      const factor = currentInterval === 0 ? 1 : currentInterval;
      nextIntervalDays = Math.max(4, Math.round(factor * currentEase * 1.3));
      nextEase = Math.min(3.0, currentEase + 0.15);
      nextState = 'review';
      nextRepetitions += 1;
    }
  }

  const dueDateMs = now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000;
  const nextDueDate = new Date(dueDateMs);
  const label = formatIntervalLabel(nextIntervalDays, langCode);

  return {
    newCard: {
      interval: nextIntervalDays,
      easeFactor: +nextEase.toFixed(2),
      repetitions: nextRepetitions,
      lapses: nextLapses,
      state: nextState,
      stepIndex: nextStep,
      dueDate: nextDueDate.toISOString(),
      updatedAt: now.toISOString(),
    },
    nextInterval: {
      intervalDays: nextIntervalDays,
      label,
      nextDueDate,
    },
  };
}

/**
 * Gets labels for all 4 rating buttons for a given card in the requested language
 */
export function getButtonEstimates(
  card: Card,
  langCode: SupportedLanguage = 'en'
): Record<ReviewRating, string> {
  return {
    1: calculateNextSchedule(card, 1, langCode).nextInterval.label,
    2: calculateNextSchedule(card, 2, langCode).nextInterval.label,
    3: calculateNextSchedule(card, 3, langCode).nextInterval.label,
    4: calculateNextSchedule(card, 4, langCode).nextInterval.label,
  };
}
