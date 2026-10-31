import React, { useState } from 'react';
import { X, Check, FolderPlus, Palette } from 'lucide-react';
import { Deck } from '../types';
import { useI18n } from '../i18n/context';

interface DeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDeck: (deckData: Partial<Deck>) => void;
  initialDeck?: Deck | null;
}

const PRESET_COLORS = [
  '#1976D2', // Anki Blue
  '#00796B', // Teal
  '#388E3C', // Green
  '#7B1FA2', // Purple
  '#C2185B', // Pink
  '#E64A19', // Deep Orange
  '#455A64', // Blue Grey
];

export const DeckModal: React.FC<DeckModalProps> = ({
  isOpen,
  onClose,
  onSaveDeck,
  initialDeck,
}) => {
  const { t } = useI18n();
  const [name, setName] = useState(initialDeck?.name || '');
  const [description, setDescription] = useState(initialDeck?.description || '');
  const [color, setColor] = useState(initialDeck?.color || PRESET_COLORS[0]);
  const [newCardsPerDay, setNewCardsPerDay] = useState(initialDeck?.newCardsPerDay || 20);
  const [reviewCardsPerDay, setReviewCardsPerDay] = useState(initialDeck?.reviewCardsPerDay || 100);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when switching decks or opening modal
  React.useEffect(() => {
    if (isOpen) {
      setName(initialDeck?.name || '');
      setDescription(initialDeck?.description || '');
      setColor(initialDeck?.color || PRESET_COLORS[0]);
      setNewCardsPerDay(initialDeck?.newCardsPerDay || 20);
      setReviewCardsPerDay(initialDeck?.reviewCardsPerDay || 100);
      setErrorMessage(null);
    }
  }, [isOpen, initialDeck]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!name.trim()) {
      setErrorMessage(t.deckModal.nameRequired);
      return;
    }

    onSaveDeck({
      id: initialDeck?.id,
      name: name.trim(),
      description: description.trim(),
      color,
      newCardsPerDay: Number(newCardsPerDay) || 20,
      reviewCardsPerDay: Number(reviewCardsPerDay) || 100,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#1976D2] dark:bg-[#1a1a1a] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-amber-300" />
            <h3 className="font-bold text-base">
              {initialDeck ? t.deckModal.editTitle : t.deckModal.createTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
              {errorMessage}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              {t.deckModal.nameLabel}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.deckModal.namePlaceholder}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              {t.deckModal.descLabel}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t.deckModal.descPlaceholder}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-gray-400" />
              <span>{t.deckModal.colorLabel}</span>
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-110 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Daily Limits */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                {t.deckModal.newCardsLimit}
              </label>
              <input
                type="number"
                min={1}
                max={999}
                value={newCardsPerDay}
                onChange={(e) => setNewCardsPerDay(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                {t.deckModal.reviewCardsLimit}
              </label>
              <input
                type="number"
                min={1}
                max={9999}
                value={reviewCardsPerDay}
                onChange={(e) => setReviewCardsPerDay(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {t.deckModal.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1976D2] hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{t.deckModal.save}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
