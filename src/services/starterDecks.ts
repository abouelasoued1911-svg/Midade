import { Card, Deck } from '../types';

// Default initial state: Anki standard single clean empty deck with 0 cards
export const INITIAL_DECKS: Deck[] = [
  {
    id: 'deck-default',
    userId: 'local',
    name: 'الافتراضية (Default)',
    description: 'الرزمة الافتراضية الأولى لبطاقاتك التعليمية.',
    color: '#1976D2',
    newCardsPerDay: 20,
    reviewCardsPerDay: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Empty by default: user adds their own cards and decks
export const INITIAL_CARDS: Card[] = [];

// Optional sample decks available only when user explicitly clicks "تحميل رزم تجريبية"
export const SAMPLE_DECKS: Deck[] = [
  {
    id: 'deck-english-sample',
    userId: 'local',
    name: 'المفردات الإنجليزية (Sample)',
    description: 'أهم الكلمات الإنجليزية مع النطق وجمل توضيحية.',
    color: '#1976D2',
    newCardsPerDay: 15,
    reviewCardsPerDay: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'deck-programming-sample',
    userId: 'local',
    name: 'البرمجة وجافاسكريبت (Sample)',
    description: 'مفاهيم برمجية وبطاقات ملء الفراغات Cloze.',
    color: '#7B1FA2',
    newCardsPerDay: 10,
    reviewCardsPerDay: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const now = new Date();

export const SAMPLE_CARDS: Card[] = [
  {
    id: 'sample-en-1',
    userId: 'local',
    deckId: 'deck-english-sample',
    front: 'Resilient\n\n/rɪˈzɪl.jənt/',
    back: 'مرن / قادر على تجاوز الصعاب سريعاً\n\nمثال:\n"She is resilient and recovers quickly."',
    cardType: 'basic',
    tags: ['english'],
    state: 'new',
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    dueDate: now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: 'sample-en-2',
    userId: 'local',
    deckId: 'deck-english-sample',
    front: 'The new feature will be {{c1::deployed}} tomorrow.',
    back: 'سيتم **نشر/إطلاق** الميزة الجديدة غداً.\n(verb: deploy = ينشر، يطلق)',
    cardType: 'cloze',
    tags: ['english', 'cloze'],
    state: 'new',
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    dueDate: now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: 'sample-prog-1',
    userId: 'local',
    deckId: 'deck-programming-sample',
    front: 'ما هو الـ Closure في لغة JavaScript؟',
    back: 'هو اقتران دالة مع البيئة المعجمية المحيطة بها، مما يتيح للدالة الوصول إلى متغيرات نطاق الدالة الخارجية حتى بعد انتهائها.',
    cardType: 'basic',
    tags: ['javascript'],
    state: 'new',
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    dueDate: now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
];
