import React, { useState } from 'react';
import {
  Plus,
  Settings,
  Play,
  RotateCcw,
  Trash2,
  Edit2,
  FolderPlus,
  PlusCircle,
  CheckCircle2,
  Layers,
  Sparkles,
  Download
} from 'lucide-react';
import { Card, Deck, DeckCounts } from '../types';
import { calculateDeckCounts } from '../services/storage';
import { useI18n } from '../i18n/context';

interface DeckListProps {
  decks: Deck[];
  cards: Card[];
  onSelectDeck: (deck: Deck) => void;
  onOpenDeckOptions: (deck: Deck) => void;
  onOpenAddCard: (deckId?: string) => void;
  onOpenCreateDeck: () => void;
  onRenameDeck: (deck: Deck) => void;
  onDeleteDeck: (deck: Deck) => void;
  onResetDeckProgress: (deck: Deck) => void;
  onLoadSamples: () => void;
  onOpenImportExport: () => void;
}

export const DeckList: React.FC<DeckListProps> = ({
  decks,
  cards,
  onSelectDeck,
  onOpenDeckOptions,
  onOpenAddCard,
  onOpenCreateDeck,
  onRenameDeck,
  onDeleteDeck,
  onResetDeckProgress,
  onLoadSamples,
  onOpenImportExport,
}) => {
  const [activeMenuDeckId, setActiveMenuDeckId] = useState<string | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const { t, isRTL } = useI18n();

  // Overall counts
  const totalCounts = calculateDeckCounts(cards);

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto pb-28 px-3 sm:px-4 py-4 select-none">
      {/* Deck List Header Bar */}
      <div className="flex items-center justify-between px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-800 mb-2">
        <span>{t.deckList.deckHeader}</span>
        <div className="flex items-center space-x-6 space-x-reverse rtl:space-x-reverse text-center">
          <span className="w-9 text-blue-600 dark:text-blue-400" title={t.deckList.newBadge}>
            {t.deckList.newBadge}
          </span>
          <span className="w-9 text-rose-600 dark:text-rose-400" title={t.deckList.learnBadge}>
            {t.deckList.learnBadge}
          </span>
          <span className="w-9 text-emerald-600 dark:text-emerald-400" title={t.deckList.dueBadge}>
            {t.deckList.dueBadge}
          </span>
          <span className="w-7"></span>
        </div>
      </div>

      {/* Empty State when no decks exist */}
      {decks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 my-auto">
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#1976D2] dark:text-blue-400 flex items-center justify-center mb-4">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">
            {t.deckList.noDecks}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-sm mb-6 leading-relaxed">
            {t.deckList.noDecksDesc}
          </p>
          <div className="flex flex-wrap gap-2.5 justify-center">
            <button
              onClick={onOpenCreateDeck}
              className="px-4 py-2.5 bg-[#1976D2] hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
            >
              <FolderPlus className="w-4 h-4" />
              <span>{t.deckList.createFirstDeck}</span>
            </button>
            <button
              onClick={onOpenImportExport}
              className="px-4 py-2.5 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>{t.deckList.importCards}</span>
            </button>
            <button
              onClick={onLoadSamples}
              className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors"
            >
              {t.deckList.sampleDecks}
            </button>
          </div>
        </div>
      ) : (
        /* Decks List */
        <div className="space-y-2">
          {decks.map((deck) => {
            const counts: DeckCounts = calculateDeckCounts(cards, deck.id);
            const isFinished = counts.totalCards > 0 && counts.newCount === 0 && counts.learningCount === 0 && counts.dueCount === 0;
            const isEmpty = counts.totalCards === 0;

            return (
              <div
                key={deck.id}
                className="group relative bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200/90 dark:border-gray-800 shadow-2xs hover:shadow-sm hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-150 flex items-center justify-between px-3 py-3"
              >
                {/* Clickable Deck Title and Info */}
                <div
                  className="flex-1 flex items-center gap-2.5 cursor-pointer px-1 overflow-hidden"
                  onClick={() => {
                    if (isEmpty) {
                      onOpenAddCard(deck.id);
                    } else {
                      onSelectDeck(deck);
                    }
                  }}
                  title={isEmpty ? t.deckList.emptyDeck : t.deckList.studyNow}
                >
                  <div
                    className="w-2.5 h-10 rounded-full shrink-0"
                    style={{ backgroundColor: deck.color || '#1976D2' }}
                  />
                  <div className="overflow-hidden">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm sm:text-base truncate flex items-center gap-2">
                      <span>{deck.name}</span>
                      {isFinished && (
                        <span title={t.deckList.finishedToday}>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        </span>
                      )}
                      {isEmpty && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full font-bold">
                          {t.deckList.emptyDeck}
                        </span>
                      )}
                    </h3>
                    {deck.description ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md">
                        {deck.description}
                      </p>
                    ) : (
                      <span className="text-[11px] text-gray-400">
                        {counts.totalCards} {t.deckList.totalCardsSuffix}
                      </span>
                    )}
                  </div>
                </div>

                {/* Counters & Action Menu */}
                <div className="flex items-center space-x-6 space-x-reverse rtl:space-x-reverse shrink-0">
                  {/* New (Blue) */}
                  <span
                    className={`w-9 text-center font-bold text-sm ${
                      counts.newCount > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600 font-normal'
                    }`}
                  >
                    {counts.newCount}
                  </span>

                  {/* Learning (Orange/Red) */}
                  <span
                    className={`w-9 text-center font-bold text-sm ${
                      counts.learningCount > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-gray-400 dark:text-gray-600 font-normal'
                    }`}
                  >
                    {counts.learningCount}
                  </span>

                  {/* Due (Green) */}
                  <span
                    className={`w-9 text-center font-bold text-sm ${
                      counts.dueCount > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-400 dark:text-gray-600 font-normal'
                    }`}
                  >
                    {counts.dueCount}
                  </span>

                  {/* Action Gear */}
                  <div className="relative w-7 flex justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuDeckId(activeMenuDeckId === deck.id ? null : deck.id);
                      }}
                      className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      aria-label="Options"
                    >
                      <Settings className="w-4 h-4" />
                    </button>

                    {/* Deck Context Popup Menu */}
                    {activeMenuDeckId === deck.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setActiveMenuDeckId(null)}
                        />
                        <div className="absolute right-0 rtl:right-auto rtl:left-0 top-8 w-52 bg-white dark:bg-[#252525] text-gray-800 dark:text-gray-100 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                          <button
                            onClick={() => {
                              setActiveMenuDeckId(null);
                              if (isEmpty) {
                                onOpenAddCard(deck.id);
                              } else {
                                onSelectDeck(deck);
                              }
                            }}
                            className="w-full text-start px-3.5 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 flex items-center gap-2.5 font-medium text-[#1976D2] dark:text-blue-400"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>{isEmpty ? t.deckList.addCardsToDeck : t.deckList.studyNow}</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuDeckId(null);
                              onOpenAddCard(deck.id);
                            }}
                            className="w-full text-start px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5"
                          >
                            <Plus className="w-3.5 h-3.5 text-amber-500" />
                            <span>{t.deckList.addCardToDeck}</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuDeckId(null);
                              onOpenDeckOptions(deck);
                            }}
                            className="w-full text-start px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5"
                          >
                            <Settings className="w-3.5 h-3.5 text-gray-500" />
                            <span>{t.deckList.deckOptions}</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuDeckId(null);
                              onRenameDeck(deck);
                            }}
                            className="w-full text-start px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                            <span>{t.deckList.renameDeck}</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuDeckId(null);
                              onResetDeckProgress(deck);
                            }}
                            className="w-full text-start px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5 text-orange-600 dark:text-orange-400"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{t.deckList.resetProgress}</span>
                          </button>

                          <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

                          <button
                            onClick={() => {
                              setActiveMenuDeckId(null);
                              onDeleteDeck(deck);
                            }}
                            className="w-full text-start px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2.5 font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{t.deckList.deleteDeck}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Today Summary Bar */}
      {decks.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#181818]/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 py-3 px-4 z-20 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2 sm:gap-3 font-medium text-gray-600 dark:text-gray-300">
              <span className="text-gray-500">{t.deckList.todaySummary}</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                {totalCounts.newCount} {t.deckList.newCards}
              </span>
              <span>•</span>
              <span className="text-rose-600 dark:text-rose-400 font-bold">
                {totalCounts.learningCount} {t.deckList.learningCards}
              </span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {totalCounts.dueCount} {t.deckList.dueCards}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {cards.length === 0 ? (
                <button
                  onClick={() => onOpenAddCard(decks[0]?.id)}
                  className="px-3.5 py-1.5 bg-[#1976D2] hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{t.deckList.addFirstCard}</span>
                </button>
              ) : (
                <button
                  onClick={() => onSelectDeck(decks[0])}
                  className="px-3.5 py-1.5 bg-[#1976D2] hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{t.deckList.study}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) with Speed Dial */}
      <div className={`fixed bottom-16 z-30 flex flex-col gap-2 ${isRTL ? 'left-5 sm:left-8 items-start' : 'right-5 sm:right-8 items-end'}`}>
        {fabOpen && (
          <div className={`flex flex-col gap-2 mb-1 animate-in slide-in-from-bottom-2 duration-150 ${isRTL ? 'items-start' : 'items-end'}`}>
            <button
              onClick={() => {
                setFabOpen(false);
                onOpenAddCard();
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#252525] text-gray-800 dark:text-gray-100 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-[#1976D2]" />
              <span>{t.nav.addCard}</span>
            </button>

            <button
              onClick={() => {
                setFabOpen(false);
                onOpenCreateDeck();
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#252525] text-gray-800 dark:text-gray-100 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-emerald-600" />
              <span>{t.nav.createDeck}</span>
            </button>

            <button
              onClick={() => {
                setFabOpen(false);
                onOpenImportExport();
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#252525] text-gray-800 dark:text-gray-100 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4 text-purple-600" />
              <span>{t.deckList.importCards}</span>
            </button>

            <button
              onClick={() => {
                setFabOpen(false);
                onLoadSamples();
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#252525] text-gray-800 dark:text-gray-100 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{t.deckList.sampleDecks}</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setFabOpen(!fabOpen)}
          aria-label="New Action"
          className={`w-14 h-14 rounded-full bg-[#1976D2] hover:bg-blue-700 text-white shadow-xl flex items-center justify-center transition-transform duration-200 ${
            fabOpen ? 'rotate-45 bg-rose-600 hover:bg-rose-700' : ''
          }`}
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};
