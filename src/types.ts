export type CardState = 'new' | 'learning' | 'review' | 'relearning';
export type CardType = 'basic' | 'cloze' | 'typeIn';
export type ReviewRating = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

export interface Deck {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color?: string;
  newCardsPerDay: number;
  reviewCardsPerDay: number;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  userId: string;
  deckId: string;
  front: string;
  back: string;
  cardType: CardType;
  tags?: string[];
  state: CardState;
  interval: number; // in days (can be decimal for hours/minutes in learning)
  easeFactor: number; // typically starts at 2.5 (250%)
  repetitions: number;
  lapses: number;
  stepIndex?: number;
  dueDate: string; // ISO string
  isFlagged?: boolean;
  isSuspended?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewLog {
  id: string;
  userId: string;
  cardId: string;
  deckId: string;
  rating: ReviewRating;
  reviewedAt: string;
  timeSpentSeconds: number;
}

export interface DeckCounts {
  newCount: number;
  learningCount: number;
  dueCount: number;
  totalCards: number;
}

export interface UserProfile {
  userId: string;
  email: string;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
  settings?: {
    theme?: 'light' | 'dark' | 'oled';
    language?: 'ar' | 'en';
    autoPlayAudio?: boolean;
    showTimer?: boolean;
  };
}

export interface Tombstone {
  id: string; // The ID of the deleted card or deck
  type: 'card' | 'deck';
  userId: string;
  deletedAt: string;
}

export interface MediaItem {
  id: string;
  filename: string;
  mimeType: string;
  dataUrl: string;
  size: number;
  createdAt: string;
}

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
