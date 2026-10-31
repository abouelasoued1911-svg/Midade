import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  FirebaseUser,
  testConnection
} from './firebase';
import { Card, Deck, ReviewLog, ReviewRating, SyncState } from './types';
import {
  getLocalCards,
  getLocalDecks,
  getLocalReviews,
  getLocalSettings,
  getLastSyncTime,
  saveLocalCards,
  saveLocalDecks,
  saveLocalReviews,
  saveLocalSettings,
  addLocalTombstone,
  initStorageMigration,
  clearUserSessionCache,
  addPendingReviewDeletion,
} from './services/storage';
import { SAMPLE_CARDS, SAMPLE_DECKS } from './services/starterDecks';
import { performCloudSync } from './services/cloudSync';
import { Header } from './components/Header';
import { NavigationDrawer } from './components/NavigationDrawer';
import { DeckList } from './components/DeckList';
import { StudyView } from './components/StudyView';
import { CardBrowser } from './components/CardBrowser';
import { CardEditorModal } from './components/CardEditorModal';
import { DeckModal } from './components/DeckModal';
import { StatsModal } from './components/StatsModal';
import { SyncModal } from './components/SyncModal';
import { ImportExportModal } from './components/ImportExportModal';
import { ConfirmModal } from './components/ConfirmModal';
import { LanguageSelectorModal } from './components/LanguageSelectorModal';
import { useI18n } from './i18n/context';
import { generateId } from './utils/id';

export default function App() {
  const { t } = useI18n();

  // Auth state
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const activeUserId = useMemo(() => (currentUser ? currentUser.uid : 'local'), [currentUser]);

  // App data state (User-partitioned)
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [reviews, setReviews] = useState<ReviewLog[]>([]);

  // Navigation & View state
  const [activeView, setActiveView] = useState<'decks' | 'study' | 'browser'>('decks');
  const [activeStudyDeck, setActiveStudyDeck] = useState<Deck | null>(null);

  // Modals state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCardEditorOpen, setIsCardEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [defaultEditorDeckId, setDefaultEditorDeckId] = useState<string | undefined>(undefined);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  // Custom non-blocking Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Sync state
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSyncTime, setLastSyncTimeState] = useState<string | null>(null);

  // Undo history for review session
  const [lastReviewUndo, setLastReviewUndo] = useState<{
    cardId: string;
    previousCard: Card;
    logId: string;
  } | null>(null);

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = getLocalSettings('local');
    return saved?.theme === 'dark';
  });

  // Apply dark mode class to html document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const settings = getLocalSettings(activeUserId);
    saveLocalSettings({ ...settings, theme: isDarkMode ? 'dark' : 'light' }, activeUserId);
  }, [isDarkMode, activeUserId]);

  // Load user data into memory when active user changes
  const loadUserData = useCallback((userId: string) => {
    const loadedDecks = getLocalDecks(userId);
    const loadedCards = getLocalCards(userId);
    const loadedReviews = getLocalReviews(userId);
    setDecks(loadedDecks);
    setCards(loadedCards);
    setReviews(loadedReviews);
    setLastSyncTimeState(getLastSyncTime(userId));
  }, []);

  // Initial Boot & Firebase Auth Listener
  useEffect(() => {
    testConnection().catch(() => {});

    // Initial load for guest/local user
    initStorageMigration('local').then(() => {
      loadUserData('local');
    }).catch(() => {
      loadUserData('local');
    });

    // Firebase Auth listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      const targetUserId = user ? user.uid : 'local';

      if (user) {
        // Authenticated user: Initialize user partition and trigger sync
        try {
          await initStorageMigration(targetUserId);
          loadUserData(targetUserId);

          setSyncState('syncing');
          const res = await performCloudSync();
          loadUserData(targetUserId);

          if (res.success) {
            setLastSyncTimeState(res.syncedAt);
            setSyncState('synced');
          } else {
            setSyncState('idle');
          }
        } catch (e) {
          console.warn('Initial sync note:', e);
          setSyncState('idle');
        }
      } else {
        // Logged out: Safely reset UI, clear session cache, load local partition
        clearUserSessionCache();
        loadUserData('local');
        setActiveView('decks');
        setActiveStudyDeck(null);
        setSyncState('idle');
      }
    });

    const handleOnline = () => {
      if (auth.currentUser) {
        performCloudSync().then((res) => {
          if (res.success) {
            loadUserData(auth.currentUser!.uid);
            setLastSyncTimeState(res.syncedAt);
            setSyncState('synced');
          }
        }).catch(() => {});
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
    };
  }, [loadUserData]);

  // Manual Trigger Sync
  const handlePerformSync = async () => {
    if (!currentUser) {
      setIsSyncModalOpen(true);
      return;
    }

    try {
      setSyncState('syncing');
      const res = await performCloudSync();
      loadUserData(currentUser.uid);
      if (res.success) {
        setLastSyncTimeState(res.syncedAt);
        setSyncState('synced');
      } else {
        setSyncState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'idle');
      }
    } catch (err) {
      console.warn('Sync failed:', err);
      setSyncState('error');
    }
  };

  // Google Sign In
  const handleSignInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setCurrentUser(result.user);
      loadUserData(result.user.uid);
      await handlePerformSync();
    } catch (err) {
      console.error('Sign-in error:', err);
      throw err;
    }
  };

  // Google Sign Out (Clean session without deleting stored user partition)
  const handleSignOut = async () => {
    await signOut(auth);
    clearUserSessionCache();
    setCurrentUser(null);
    loadUserData('local');
    setActiveView('decks');
    setActiveStudyDeck(null);
    setSyncState('idle');
  };

  // Select deck for study
  const handleSelectDeck = (deck: Deck) => {
    setActiveStudyDeck(deck);
    setActiveView('study');
    setLastReviewUndo(null);
  };

  // Card update during study (SM-2 answer rated)
  const handleStudyCardReviewed = (
    updatedCard: Card,
    rating: ReviewRating,
    timeSpentSec: number
  ) => {
    const prevCard = cards.find((c) => c.id === updatedCard.id);
    if (!prevCard) return;

    const logId = generateId('rev');
    const newLog: ReviewLog = {
      id: logId,
      userId: activeUserId,
      cardId: updatedCard.id,
      deckId: updatedCard.deckId,
      rating,
      reviewedAt: new Date().toISOString(),
      timeSpentSeconds: timeSpentSec,
    };

    setLastReviewUndo({
      cardId: updatedCard.id,
      previousCard: { ...prevCard },
      logId,
    });

    const newCards = cards.map((c) => (c.id === updatedCard.id ? updatedCard : c));
    const newReviews = [...reviews, newLog];

    setCards(newCards);
    setReviews(newReviews);

    saveLocalCards(newCards, activeUserId);
    saveLocalReviews(newReviews, activeUserId);

    // Opportunistic background sync if user is connected
    if (currentUser && syncState !== 'syncing') {
      performCloudSync().catch(() => {});
    }
  };

  // Undo last card review
  const handleUndoLastReview = () => {
    if (!lastReviewUndo) return;

    const newCards = cards.map((c) =>
      c.id === lastReviewUndo.cardId ? lastReviewUndo.previousCard : c
    );
    const newReviews = reviews.filter((r) => r.id !== lastReviewUndo.logId);

    setCards(newCards);
    setReviews(newReviews);
    saveLocalCards(newCards, activeUserId);
    saveLocalReviews(newReviews, activeUserId);

    // Ensure undone review is deleted from cloud if already synced
    addPendingReviewDeletion(lastReviewUndo.logId, activeUserId);
    if (currentUser) {
      performCloudSync().catch(() => {});
    }

    setLastReviewUndo(null);
  };

  // Save Card (create new or edit existing)
  const handleSaveCard = (cardData: Partial<Card>) => {
    const now = new Date().toISOString();
    let updatedCards: Card[];

    const effectiveDeckId =
      cardData.deckId ||
      decks[0]?.id ||
      generateId('deck-default');

    // If deck does not exist, create it automatically
    if (!decks.some((d) => d.id === effectiveDeckId)) {
      const autoDeck: Deck = {
        id: effectiveDeckId,
        userId: activeUserId,
        name: 'الافتراضية (Default)',
        newCardsPerDay: 20,
        reviewCardsPerDay: 100,
        color: '#1976D2',
        createdAt: now,
        updatedAt: now,
      };
      const newDecks = [autoDeck, ...decks];
      setDecks(newDecks);
      saveLocalDecks(newDecks, activeUserId);
    }

    if (cardData.id) {
      // Editing existing card
      updatedCards = cards.map((c) =>
        c.id === cardData.id
          ? ({
              ...c,
              ...cardData,
              deckId: effectiveDeckId,
              updatedAt: now,
            } as Card)
          : c
      );
    } else {
      // Adding new card with reliable UUID
      const newCard: Card = {
        id: generateId('card'),
        userId: activeUserId,
        deckId: effectiveDeckId,
        front: cardData.front || '',
        back: cardData.back || '',
        cardType: cardData.cardType || 'basic',
        tags: cardData.tags || [],
        state: 'new',
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        dueDate: now,
        createdAt: now,
        updatedAt: now,
      };
      updatedCards = [newCard, ...cards];
    }

    setCards(updatedCards);
    saveLocalCards(updatedCards, activeUserId);

    if (currentUser) {
      performCloudSync().catch(() => {});
    }
  };

  // Delete Card with non-blocking modal
  const handleDeleteCard = (cardId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: t.confirm.deleteCardTitle,
      message: t.confirm.deleteCardMsg,
      confirmText: t.browser.deleteCard,
      isDestructive: true,
      onConfirm: () => {
        addLocalTombstone(cardId, 'card', activeUserId);
        const filtered = cards.filter((c) => c.id !== cardId);
        setCards(filtered);
        saveLocalCards(filtered, activeUserId);
        setConfirmDialog(null);
        if (currentUser) performCloudSync().catch(() => {});
      },
    });
  };

  // Toggle Flag Card
  const handleToggleFlagCard = (card: Card) => {
    const updated = cards.map((c) =>
      c.id === card.id ? { ...c, isFlagged: !c.isFlagged, updatedAt: new Date().toISOString() } : c
    );
    setCards(updated);
    saveLocalCards(updated, activeUserId);
  };

  // Toggle Suspend Card
  const handleToggleSuspendCard = (card: Card) => {
    const updated = cards.map((c) =>
      c.id === card.id
        ? { ...c, isSuspended: !c.isSuspended, updatedAt: new Date().toISOString() }
        : c
    );
    setCards(updated);
    saveLocalCards(updated, activeUserId);
  };

  // Save Deck (Create or Edit)
  const handleSaveDeck = (deckData: Partial<Deck>) => {
    const now = new Date().toISOString();
    let updatedDecks: Deck[];

    if (deckData.id) {
      updatedDecks = decks.map((d) =>
        d.id === deckData.id ? ({ ...d, ...deckData, updatedAt: now } as Deck) : d
      );
    } else {
      const newDeck: Deck = {
        id: generateId('deck'),
        userId: activeUserId,
        name: deckData.name || 'Deck',
        description: deckData.description || '',
        color: deckData.color || '#1976D2',
        newCardsPerDay: deckData.newCardsPerDay || 20,
        reviewCardsPerDay: deckData.reviewCardsPerDay || 100,
        createdAt: now,
        updatedAt: now,
      };
      updatedDecks = [...decks, newDeck];
    }

    setDecks(updatedDecks);
    saveLocalDecks(updatedDecks, activeUserId);

    if (currentUser) performCloudSync().catch(() => {});
  };

  // Delete Deck with non-blocking modal
  const handleDeleteDeck = (deck: Deck) => {
    const count = cards.filter((c) => c.deckId === deck.id).length;
    setConfirmDialog({
      isOpen: true,
      title: t.confirm.deleteDeckTitle,
      message: `${t.confirm.deleteDeckMsg} "${deck.name}" (${count})?`,
      confirmText: t.deckList.deleteDeck,
      isDestructive: true,
      onConfirm: () => {
        addLocalTombstone(deck.id, 'deck', activeUserId);
        cards.filter((c) => c.deckId === deck.id).forEach((c) => {
          addLocalTombstone(c.id, 'card', activeUserId);
        });

        const filteredDecks = decks.filter((d) => d.id !== deck.id);
        const filteredCards = cards.filter((c) => c.deckId !== deck.id);

        setDecks(filteredDecks);
        setCards(filteredCards);
        saveLocalDecks(filteredDecks, activeUserId);
        saveLocalCards(filteredCards, activeUserId);

        if (activeStudyDeck?.id === deck.id) {
          setActiveView('decks');
          setActiveStudyDeck(null);
        }

        setConfirmDialog(null);
        if (currentUser) performCloudSync().catch(() => {});
      },
    });
  };

  // Reset Progress of a Deck with non-blocking modal
  const handleResetDeckProgress = (deck: Deck) => {
    setConfirmDialog({
      isOpen: true,
      title: t.confirm.resetDeckTitle,
      message: `${t.confirm.resetDeckMsg} "${deck.name}"?`,
      confirmText: t.deckList.resetProgress,
      isDestructive: false,
      onConfirm: () => {
        const now = new Date().toISOString();
        const updatedCards = cards.map((c) => {
          if (c.deckId === deck.id) {
            return {
              ...c,
              state: 'new' as const,
              interval: 0,
              easeFactor: 2.5,
              repetitions: 0,
              lapses: 0,
              dueDate: now,
              updatedAt: now,
            };
          }
          return c;
        });

        setCards(updatedCards);
        saveLocalCards(updatedCards, activeUserId);
        setConfirmDialog(null);
        if (currentUser) performCloudSync().catch(() => {});
      },
    });
  };

  // Load Starter Sample Decks
  const handleLoadSamples = () => {
    setConfirmDialog({
      isOpen: true,
      title: t.confirm.loadSamplesTitle,
      message: t.confirm.loadSamplesMsg,
      confirmText: t.deckList.sampleDecks,
      isDestructive: false,
      onConfirm: () => {
        const existingDeckIds = new Set(decks.map((d) => d.id));
        const newDecksToAdd = SAMPLE_DECKS.filter((d) => !existingDeckIds.has(d.id)).map((d) => ({
          ...d,
          userId: activeUserId,
        }));
        const existingCardIds = new Set(cards.map((c) => c.id));
        const newCardsToAdd = SAMPLE_CARDS.filter((c) => !existingCardIds.has(c.id)).map((c) => ({
          ...c,
          userId: activeUserId,
        }));

        const mergedDecks = [...decks, ...newDecksToAdd];
        const mergedCards = [...cards, ...newCardsToAdd];

        setDecks(mergedDecks);
        setCards(mergedCards);
        saveLocalDecks(mergedDecks, activeUserId);
        saveLocalCards(mergedCards, activeUserId);
        setConfirmDialog(null);
        if (currentUser) performCloudSync().catch(() => {});
      },
    });
  };

  // Import Decks and Cards from JSON / CSV / APKG
  const handleImportDecksAndCards = (newDecks: Deck[], newCards: Card[]) => {
    const existingDeckMap = new Map(decks.map((d) => [d.id, d]));
    newDecks.forEach((d) => existingDeckMap.set(d.id, { ...d, userId: activeUserId }));

    const existingCardMap = new Map(cards.map((c) => [c.id, c]));
    newCards.forEach((c) => existingCardMap.set(c.id, { ...c, userId: activeUserId }));

    const finalDecks = Array.from(existingDeckMap.values());
    const finalCards = Array.from(existingCardMap.values());

    setDecks(finalDecks);
    setCards(finalCards);
    saveLocalDecks(finalDecks, activeUserId);
    saveLocalCards(finalCards, activeUserId);

    if (currentUser) performCloudSync().catch(() => {});
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#121212] text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <Header
        onToggleDrawer={() => setIsDrawerOpen(true)}
        onOpenCardBrowser={() => setActiveView('browser')}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenImportExport={() => setIsImportExportOpen(true)}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenLanguageModal={() => setIsLanguageModalOpen(true)}
        onManualSync={handlePerformSync}
        onGoHome={() => {
          setActiveView('decks');
          setActiveStudyDeck(null);
        }}
        syncState={syncState}
        lastSyncTime={lastSyncTime}
        currentUser={currentUser}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      {/* Slide-out Navigation Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectTab={(tab) => {
          if (tab === 'decks') {
            setActiveView('decks');
            setActiveStudyDeck(null);
          }
          if (tab === 'browser') setActiveView('browser');
          if (tab === 'stats') setIsStatsOpen(true);
          if (tab === 'sync') setIsSyncModalOpen(true);
          if (tab === 'importExport') setIsImportExportOpen(true);
        }}
        onOpenAddCard={() => {
          setEditingCard(null);
          setDefaultEditorDeckId(undefined);
          setIsCardEditorOpen(true);
        }}
        onOpenCreateDeck={() => {
          setEditingDeck(null);
          setIsDeckModalOpen(true);
        }}
        onOpenLanguageModal={() => setIsLanguageModalOpen(true)}
        currentUser={currentUser}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {activeView === 'decks' && (
          <DeckList
            decks={decks}
            cards={cards}
            onSelectDeck={handleSelectDeck}
            onOpenDeckOptions={(deck) => {
              setEditingDeck(deck);
              setIsDeckModalOpen(true);
            }}
            onOpenAddCard={(deckId) => {
              setEditingCard(null);
              setDefaultEditorDeckId(deckId);
              setIsCardEditorOpen(true);
            }}
            onOpenCreateDeck={() => {
              setEditingDeck(null);
              setIsDeckModalOpen(true);
            }}
            onRenameDeck={(deck) => {
              setEditingDeck(deck);
              setIsDeckModalOpen(true);
            }}
            onDeleteDeck={handleDeleteDeck}
            onResetDeckProgress={handleResetDeckProgress}
            onLoadSamples={handleLoadSamples}
            onOpenImportExport={() => setIsImportExportOpen(true)}
          />
        )}

        {activeView === 'study' && activeStudyDeck && (
          <StudyView
            deck={activeStudyDeck}
            allCards={cards}
            onBack={() => {
              setActiveView('decks');
              setActiveStudyDeck(null);
            }}
            onUpdateCard={handleStudyCardReviewed}
            onEditCard={(card) => {
              setEditingCard(card);
              setIsCardEditorOpen(true);
            }}
            onToggleFlagCard={handleToggleFlagCard}
            onSuspendCard={handleToggleSuspendCard}
            onUndoLastReview={handleUndoLastReview}
            canUndo={lastReviewUndo !== null}
          />
        )}

        {activeView === 'browser' && (
          <CardBrowser
            cards={cards}
            decks={decks}
            onBack={() => {
              setActiveView('decks');
              setActiveStudyDeck(null);
            }}
            onOpenAddCard={(deckId) => {
              setEditingCard(null);
              setDefaultEditorDeckId(deckId);
              setIsCardEditorOpen(true);
            }}
            onEditCard={(card) => {
              setEditingCard(card);
              setIsCardEditorOpen(true);
            }}
            onDeleteCard={handleDeleteCard}
            onToggleFlagCard={handleToggleFlagCard}
            onToggleSuspendCard={handleToggleSuspendCard}
          />
        )}
      </main>

      {/* Card Editor Modal */}
      <CardEditorModal
        isOpen={isCardEditorOpen}
        onClose={() => {
          setIsCardEditorOpen(false);
          setEditingCard(null);
        }}
        onSaveCard={handleSaveCard}
        initialCard={editingCard}
        decks={decks}
        defaultDeckId={defaultEditorDeckId}
      />

      {/* Deck Options / Creation Modal */}
      <DeckModal
        isOpen={isDeckModalOpen}
        onClose={() => {
          setIsDeckModalOpen(false);
          setEditingDeck(null);
        }}
        onSaveDeck={handleSaveDeck}
        initialDeck={editingDeck}
      />

      {/* Statistics Modal */}
      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        cards={cards}
        decks={decks}
        reviews={reviews}
      />

      {/* Firebase Cloud Sync & Auth Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        currentUser={currentUser}
        onSignInWithGoogle={handleSignInWithGoogle}
        onSignOut={handleSignOut}
        onPerformSync={handlePerformSync}
        syncState={syncState}
        lastSyncTime={lastSyncTime}
        decksCount={decks.length}
        cardsCount={cards.length}
      />

      {/* Import / Export Backup Modal */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        decks={decks}
        cards={cards}
        reviews={reviews}
        onImportDecksAndCards={handleImportDecksAndCards}
      />

      {/* In-App Non-Blocking Confirmation Modal */}
      {confirmDialog && (
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          isDestructive={confirmDialog.isDestructive}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
      />
    </div>
  );
}
