import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  ArrowRight,
  ArrowLeft,
  Flag,
  EyeOff,
  Trash2,
  Edit2,
  BookOpen,
  Volume2
} from 'lucide-react';
import { Card, Deck } from '../types';
import { speakText } from '../services/tts';
import { useI18n } from '../i18n/context';

interface CardBrowserProps {
  cards: Card[];
  decks: Deck[];
  onBack: () => void;
  onOpenAddCard: (deckId?: string) => void;
  onEditCard: (card: Card) => void;
  onDeleteCard: (cardId: string) => void;
  onToggleFlagCard: (card: Card) => void;
  onToggleSuspendCard: (card: Card) => void;
}

export const CardBrowser: React.FC<CardBrowserProps> = ({
  cards,
  decks,
  onBack,
  onOpenAddCard,
  onEditCard,
  onDeleteCard,
  onToggleFlagCard,
  onToggleSuspendCard,
}) => {
  const { t, isRTL } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeckId, setSelectedDeckId] = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'new' | 'learning' | 'review' | 'flagged' | 'suspended'>('all');

  const deckMap = useMemo(() => {
    const map = new Map<string, string>();
    decks.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [decks]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      // Deck filter
      if (selectedDeckId !== 'all' && card.deckId !== selectedDeckId) {
        return false;
      }

      // State / special filter
      if (selectedFilter === 'flagged' && !card.isFlagged) return false;
      if (selectedFilter === 'suspended' && !card.isSuspended) return false;
      if (selectedFilter === 'new' && card.state !== 'new') return false;
      if (selectedFilter === 'learning' && (card.state !== 'learning' && card.state !== 'relearning')) return false;
      if (selectedFilter === 'review' && card.state !== 'review') return false;

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const frontMatch = card.front.toLowerCase().includes(q);
        const backMatch = card.back.toLowerCase().includes(q);
        const tagsMatch = card.tags?.some((t) => t.toLowerCase().includes(q));
        if (!frontMatch && !backMatch && !tagsMatch) return false;
      }

      return true;
    });
  }, [cards, selectedDeckId, selectedFilter, searchQuery]);

  const filterOptions = [
    { id: 'all', label: t.browser.allFilter },
    { id: 'new', label: t.browser.newFilter },
    { id: 'learning', label: t.browser.learningFilter },
    { id: 'review', label: t.browser.reviewFilter },
    { id: 'flagged', label: t.browser.flaggedFilter },
    { id: 'suspended', label: t.browser.suspendedFilter },
  ];

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-gray-50 dark:bg-[#121212] select-none">
      {/* Top Bar */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            aria-label="Back"
          >
            <BackIcon className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-base text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#1976D2]" />
              <span>{t.browser.title}</span>
            </h2>
            <span className="text-xs text-gray-500">
              {filteredCards.length} / {cards.length} {t.browser.cardsCountLabel}
            </span>
          </div>
        </div>

        <button
          onClick={() => onOpenAddCard(selectedDeckId !== 'all' ? selectedDeckId : undefined)}
          className="px-3.5 py-1.5 bg-[#1976D2] hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t.cardEditor.addTitle}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-gray-800 p-3 space-y-2 shrink-0">
        <div className="flex gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className={`w-4 h-4 text-gray-400 absolute top-3 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.browser.searchPlaceholder}
              className={`w-full py-2 text-xs sm:text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#252525] text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'
              }`}
            />
          </div>

          {/* Deck Selector */}
          <select
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#252525] text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t.browser.allDecks} ({decks.length})</option>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {filterOptions.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedFilter(item.id as any)}
              className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
                selectedFilter === item.id
                  ? 'bg-[#1976D2] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards List Table */}
      <div className="flex-1 overflow-y-auto p-3 max-w-5xl mx-auto w-full">
        {filteredCards.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t.browser.noCardsFound}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCards.map((card) => {
              const deckName = deckMap.get(card.deckId) || 'Deck';
              return (
                <div
                  key={card.id}
                  className={`bg-white dark:bg-[#1e1e1e] rounded-lg border p-3 shadow-2xs hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    card.isSuspended
                      ? 'border-gray-300 dark:border-gray-800 opacity-60 bg-gray-50 dark:bg-neutral-900'
                      : card.isFlagged
                      ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20'
                      : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  {/* Card Content Snippet */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onEditCard(card)}
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                        {deckName}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          card.state === 'new'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                            : card.state === 'learning' || card.state === 'relearning'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}
                      >
                        {card.state === 'new' ? t.deckList.newCards : card.state === 'learning' ? t.deckList.learningCards : t.deckList.dueCards}
                      </span>

                      {card.isSuspended && (
                        <span className="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded">
                          {t.browser.suspendedBadge}
                        </span>
                      )}

                      {card.cardType === 'cloze' && (
                        <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                          {t.browser.clozeBadge}
                        </span>
                      )}
                    </div>

                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate mb-0.5">
                      {card.front.replace(/\{\{c\d+::(.*?)(::.*?)?\}\}/g, '[$1]')}
                    </div>

                    <div className="text-gray-500 dark:text-gray-400 text-xs truncate">
                      {card.back}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 space-x-reverse rtl:space-x-reverse self-end sm:self-center shrink-0">
                    <button
                      onClick={() => speakText(card.front)}
                      className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                      title={t.study.listenAudio}
                      aria-label={t.study.listenAudio}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onToggleFlagCard(card)}
                      className={`p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                        card.isFlagged ? 'text-amber-500' : 'text-gray-400'
                      }`}
                      title={card.isFlagged ? t.study.unflagCard : t.study.flagCard}
                      aria-label={card.isFlagged ? t.study.unflagCard : t.study.flagCard}
                    >
                      <Flag className={`w-4 h-4 ${card.isFlagged ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      onClick={() => onToggleSuspendCard(card)}
                      className={`p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                        card.isSuspended ? 'text-rose-500' : 'text-gray-400'
                      }`}
                      title={card.isSuspended ? t.browser.allFilter : t.study.suspendCard}
                      aria-label={t.study.suspendCard}
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onEditCard(card)}
                      className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-600 dark:text-blue-400"
                      title={t.browser.editCard}
                      aria-label={t.browser.editCard}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDeleteCard(card.id)}
                      className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500"
                      title={t.browser.deleteCard}
                      aria-label={t.browser.deleteCard}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
