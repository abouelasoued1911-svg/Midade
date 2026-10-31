import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  Undo2,
  Flag,
  MoreVertical,
  Edit3,
  EyeOff,
  Info,
  CheckCircle,
  Layers,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Card, Deck, DeckCounts, ReviewRating } from '../types';
import { calculateNextSchedule, formatIntervalLabel, getButtonEstimates } from '../services/ankiAlgorithm';
import { calculateDeckCounts, getDeckStudyQueue } from '../services/storage';
import { speakText } from '../services/tts';
import { useI18n } from '../i18n/context';
import { renderQuestionCloze, renderAnswerCloze } from '../utils/sanitizeHtml';

interface StudyViewProps {
  deck: Deck;
  allCards: Card[];
  onBack: () => void;
  onUpdateCard: (updatedCard: Card, rating: ReviewRating, timeSpentSec: number) => void;
  onEditCard: (card: Card) => void;
  onToggleFlagCard: (card: Card) => void;
  onSuspendCard: (card: Card) => void;
  onUndoLastReview?: () => void;
  canUndo?: boolean;
}

export const StudyView: React.FC<StudyViewProps> = ({
  deck,
  allCards,
  onBack,
  onUpdateCard,
  onEditCard,
  onToggleFlagCard,
  onSuspendCard,
  onUndoLastReview,
  canUndo = false,
}) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [userTypeInput, setUserTypeInput] = useState('');
  const [showCardMenu, setShowCardMenu] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());
  const [extraStudyMode, setExtraStudyMode] = useState(false);

  const { t, language, isRTL } = useI18n();

  // Compute deck cards queue
  const queue = useMemo(() => {
    if (extraStudyMode) {
      return allCards.filter((c) => c.deckId === deck.id && !c.isSuspended);
    }
    return getDeckStudyQueue(allCards, deck);
  }, [allCards, deck, extraStudyMode]);

  const currentCard = queue[0] || null;
  const counts: DeckCounts = calculateDeckCounts(allCards, deck.id);

  // Reset timer on new card
  useEffect(() => {
    setCardStartTime(Date.now());
    setShowAnswer(false);
    setUserTypeInput('');
  }, [currentCard?.id]);

  // Clean up speech synthesis when unmounting study view
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Launch celebratory confetti when finished
  useEffect(() => {
    if (!currentCard && allCards.some((c) => c.deckId === deck.id)) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore if fails
      }
    }
  }, [currentCard, allCards, deck.id]);

  // Handle rating click
  const handleRate = useCallback(
    (rating: ReviewRating) => {
      if (!currentCard) return;
      const timeSpentSec = Math.max(1, Math.round((Date.now() - cardStartTime) / 1000));
      const { newCard } = calculateNextSchedule(currentCard, rating, language);
      const mergedCard: Card = {
        ...currentCard,
        ...newCard,
      };
      onUpdateCard(mergedCard, rating, timeSpentSec);
    },
    [currentCard, cardStartTime, language, onUpdateCard]
  );

  // Keyboard shortcuts (Space = Show / Good, 1 = Again, 2 = Hard, 3 = Good, 4 = Easy)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Enter' && !showAnswer) {
          e.preventDefault();
          setShowAnswer(true);
        }
        return;
      }

      if (!currentCard) return;

      if (!showAnswer) {
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          setShowAnswer(true);
        }
      } else {
        if (e.key === '1') {
          e.preventDefault();
          handleRate(1);
        } else if (e.key === '2') {
          e.preventDefault();
          handleRate(2);
        } else if (e.key === '3' || e.code === 'Space') {
          e.preventDefault();
          handleRate(3);
        } else if (e.key === '4') {
          e.preventDefault();
          handleRate(4);
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && canUndo && onUndoLastReview) {
        e.preventDefault();
        onUndoLastReview();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, currentCard, handleRate, canUndo, onUndoLastReview]);

  // Format question text with sanitized cloze replacement for front
  const renderQuestionText = (text: string) => renderQuestionCloze(text);

  // Format answer text with sanitized highlighted cloze
  const renderAnswerText = (text: string) => renderAnswerCloze(text);

  // Button estimates in current language
  const estimates = currentCard ? getButtonEstimates(currentCard, language) : null;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-gray-100 dark:bg-[#121212] select-none">
      {/* Top Study Action Bar */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 px-3 py-2 flex items-center justify-between shadow-2xs z-10 shrink-0">
        {/* Back and Deck Title */}
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            title={t.study.backToDecks}
          >
            {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <h2 className="font-bold text-sm sm:text-base text-gray-800 dark:text-gray-100 truncate max-w-[180px] sm:max-w-xs">
            {deck.name}
          </h2>
        </div>

        {/* Live Card Counters (New / Learn / Due) */}
        <div className="flex items-center space-x-3 space-x-reverse rtl:space-x-reverse text-xs sm:text-sm font-bold bg-gray-50 dark:bg-[#252525] px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
          <span className="text-blue-600 dark:text-blue-400" title={t.deckList.newBadge}>
            {counts.newCount}
          </span>
          <span className="text-gray-300 dark:text-gray-600 font-light">•</span>
          <span className="text-rose-600 dark:text-rose-400" title={t.deckList.learnBadge}>
            {counts.learningCount}
          </span>
          <span className="text-gray-300 dark:text-gray-600 font-light">•</span>
          <span className="text-emerald-600 dark:text-emerald-400" title={t.deckList.dueBadge}>
            {counts.dueCount}
          </span>
        </div>

        {/* Actions: Undo, Flag, Menu */}
        <div className="flex items-center space-x-1 space-x-reverse rtl:space-x-reverse">
          {canUndo && onUndoLastReview && (
            <button
              onClick={onUndoLastReview}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-amber-600 dark:text-amber-400 transition-colors"
              title={t.study.undoReview}
            >
              <Undo2 className="w-4 h-4" />
            </button>
          )}

          {currentCard && (
            <button
              onClick={() => onToggleFlagCard(currentCard)}
              className={`p-1.5 rounded-full transition-colors ${
                currentCard.isFlagged
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              }`}
              title={currentCard.isFlagged ? t.study.unflagCard : t.study.flagCard}
            >
              <Flag className={`w-4 h-4 ${currentCard.isFlagged ? 'fill-current' : ''}`} />
            </button>
          )}

          {/* Card Menu */}
          {currentCard && (
            <div className="relative">
              <button
                onClick={() => setShowCardMenu(!showCardMenu)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showCardMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCardMenu(false)} />
                  <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-1 w-48 bg-white dark:bg-[#252525] rounded-lg shadow-xl border border-gray-100 dark:border-gray-800 py-1 z-50 text-xs">
                    <button
                      onClick={() => {
                        setShowCardMenu(false);
                        onEditCard(currentCard);
                      }}
                      className="w-full text-start px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                      <span>{t.study.editCard}</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowCardMenu(false);
                        setShowInfoModal(true);
                      }}
                      className="w-full text-start px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Info className="w-3.5 h-3.5 text-gray-500" />
                      <span>{t.study.cardInfo}</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowCardMenu(false);
                        onSuspendCard(currentCard);
                      }}
                      className="w-full text-start px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-rose-500"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>{t.study.suspendCard}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Study Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col items-center justify-start">
        {currentCard ? (
          <div className="w-full max-w-2xl bg-white dark:bg-[#1e1e1e] rounded-xl shadow-md border border-gray-200/90 dark:border-gray-800 p-6 flex flex-col min-h-[320px] transition-all">
            {/* Tags Header */}
            {currentCard.tags && currentCard.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {currentCard.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Front Question Content */}
            <div className="relative text-center my-auto py-4">
              <div
                className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap select-text card-content"
                dangerouslySetInnerHTML={{ __html: renderQuestionText(currentCard.front) }}
              />

              {/* TTS Speaker for Question */}
              <button
                onClick={() => speakText(currentCard.front)}
                className="inline-flex items-center gap-1.5 mt-3 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full transition-colors"
                title={t.study.listenAudio}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{t.study.listenAudio}</span>
              </button>
            </div>

            {/* Type-in Answer Field (If cardType === 'typeIn') */}
            {currentCard.cardType === 'typeIn' && (
              <div className="my-4">
                <input
                  type="text"
                  value={userTypeInput}
                  onChange={(e) => setUserTypeInput(e.target.value)}
                  placeholder={t.study.typePlaceholder}
                  disabled={showAnswer}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#252525] text-gray-900 dark:text-gray-100 text-center font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {showAnswer && (
                  <div className="mt-2 text-center text-sm font-mono">
                    <span className="text-gray-400 text-xs block mb-1">{t.study.typeComparison}</span>
                    <span
                      className={`font-bold ${
                        userTypeInput.trim().toLowerCase() === currentCard.back.trim().toLowerCase()
                          ? 'text-emerald-500'
                          : 'text-rose-500'
                      }`}
                    >
                      {userTypeInput || t.study.noInputTyped}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Answer (Back) Content - Shown after click */}
            {showAnswer && (
              <div className="mt-6 pt-6 border-t border-dashed border-gray-200 dark:border-gray-700 text-center animate-in fade-in slide-in-from-top-2 duration-150">
                <div
                  className="text-lg sm:text-xl font-medium text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap select-text card-content"
                  dangerouslySetInnerHTML={{
                    __html: renderAnswerText(currentCard.back || currentCard.front),
                  }}
                />

                <button
                  onClick={() => speakText(currentCard.back || currentCard.front)}
                  className="inline-flex items-center gap-1.5 mt-3 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full transition-colors"
                  title={t.study.listenAnswer}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{t.study.listenAnswer}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Deck Complete / All Due Studied */
          <div className="w-full max-w-lg bg-white dark:bg-[#1e1e1e] rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-8 text-center my-auto">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10" />
            </div>

            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              {t.study.deckFinished}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              {t.study.deckFinishedDesc}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={onBack}
                className="px-5 py-2.5 bg-[#1976D2] hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Layers className="w-4 h-4" />
                <span>{t.study.backToDecks}</span>
              </button>

              <button
                onClick={() => setExtraStudyMode(true)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{t.study.customStudy}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Study Rating Bar */}
      {currentCard && (
        <div className="bg-white dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-gray-800 p-3 sm:p-4 shrink-0 shadow-lg">
          <div className="max-w-2xl mx-auto">
            {!showAnswer ? (
              <button
                onClick={() => setShowAnswer(true)}
                className="w-full py-3.5 bg-[#1976D2] hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-base shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <span>{t.study.showAnswer}</span>
                <span className="text-xs text-blue-200 font-normal hidden sm:inline">{t.study.spaceKeyHint}</span>
              </button>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {/* 1: Again (Red) */}
                <button
                  onClick={() => handleRate(1)}
                  className="py-2.5 sm:py-3 px-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 rounded-lg flex flex-col items-center justify-center transition-all active:scale-95"
                >
                  <span className="text-xs text-rose-500/80 mb-0.5 font-mono">
                    {estimates ? estimates[1] : '< 1 min'}
                  </span>
                  <span className="font-bold text-xs sm:text-sm">{t.study.again}</span>
                  <span className="text-[10px] text-gray-400 hidden sm:inline">(1)</span>
                </button>

                {/* 2: Hard (Orange) */}
                <button
                  onClick={() => handleRate(2)}
                  className="py-2.5 sm:py-3 px-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 rounded-lg flex flex-col items-center justify-center transition-all active:scale-95"
                >
                  <span className="text-xs text-amber-500/80 mb-0.5 font-mono">
                    {estimates ? estimates[2] : '12 h'}
                  </span>
                  <span className="font-bold text-xs sm:text-sm">{t.study.hard}</span>
                  <span className="text-[10px] text-gray-400 hidden sm:inline">(2)</span>
                </button>

                {/* 3: Good (Green) */}
                <button
                  onClick={() => handleRate(3)}
                  className="py-2.5 sm:py-3 px-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border border-emerald-400 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 ring-2 ring-emerald-500/20"
                >
                  <span className="text-xs text-emerald-600/80 mb-0.5 font-mono">
                    {estimates ? estimates[3] : '1 d'}
                  </span>
                  <span className="font-bold text-xs sm:text-sm">{t.study.good}</span>
                  <span className="text-[10px] text-gray-400 hidden sm:inline">(3)</span>
                </button>

                {/* 4: Easy (Blue) */}
                <button
                  onClick={() => handleRate(4)}
                  className="py-2.5 sm:py-3 px-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400 rounded-lg flex flex-col items-center justify-center transition-all active:scale-95"
                >
                  <span className="text-xs text-blue-500/80 mb-0.5 font-mono">
                    {estimates ? estimates[4] : '4 d'}
                  </span>
                  <span className="font-bold text-xs sm:text-sm">{t.study.easy}</span>
                  <span className="text-[10px] text-gray-400 hidden sm:inline">(4)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card Info Modal */}
      {showInfoModal && currentCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
          <div className="bg-white dark:bg-[#222] rounded-xl max-w-sm w-full p-5 shadow-2xl border border-gray-200 dark:border-gray-800">
            <h3 className="font-bold text-base mb-3 flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <Info className="w-5 h-5 text-blue-500" />
              <span>{t.study.sm2InfoTitle}</span>
            </h3>

            <div className="space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span>{t.study.state}</span>
                <span className="font-semibold text-blue-600">{currentCard.state}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span>{t.study.easeFactor}</span>
                <span className="font-semibold">{Math.round((currentCard.easeFactor || 2.5) * 100)}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span>{t.study.interval}</span>
                <span className="font-semibold">{formatIntervalLabel(currentCard.interval || 0, language)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span>{t.study.repetitions}</span>
                <span className="font-semibold">{currentCard.repetitions || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span>{t.study.lapses}</span>
                <span className="font-semibold text-rose-500">{currentCard.lapses || 0}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>{t.study.nextDue}</span>
                <span className="font-semibold text-xs">{new Date(currentCard.dueDate).toLocaleDateString()}</span>
              </div>
            </div>

            <button
              onClick={() => setShowInfoModal(false)}
              className="mt-5 w-full py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-semibold"
            >
              {t.study.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
