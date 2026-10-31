import React, { useState, useRef } from 'react';
import {
  X,
  Check,
  Tag,
  Volume2,
  Eye,
  Edit3
} from 'lucide-react';
import { Card, CardType, Deck } from '../types';
import { speakText } from '../services/tts';
import { useI18n } from '../i18n/context';

interface CardEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCard: (cardData: Partial<Card>) => void;
  initialCard?: Card | null;
  decks: Deck[];
  defaultDeckId?: string;
}

export const CardEditorModal: React.FC<CardEditorModalProps> = ({
  isOpen,
  onClose,
  onSaveCard,
  initialCard,
  decks,
  defaultDeckId,
}) => {
  const { t } = useI18n();
  const [deckId, setDeckId] = useState<string>(
    initialCard?.deckId || defaultDeckId || (decks[0]?.id ?? '')
  );
  const [cardType, setCardType] = useState<CardType>(initialCard?.cardType || 'basic');
  const [front, setFront] = useState<string>(initialCard?.front || '');
  const [back, setBack] = useState<string>(initialCard?.back || '');
  const [tagInput, setTagInput] = useState<string>(initialCard?.tags?.join(', ') || '');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const frontInputRef = useRef<HTMLTextAreaElement>(null);

  // Sync state when editing a new/different card or changing deck
  React.useEffect(() => {
    if (isOpen) {
      setDeckId(initialCard?.deckId || defaultDeckId || (decks[0]?.id ?? ''));
      setCardType(initialCard?.cardType || 'basic');
      setFront(initialCard?.front || '');
      setBack(initialCard?.back || '');
      setTagInput(initialCard?.tags?.join(', ') || '');
      setActiveTab('edit');
      setErrorMessage(null);
    }
  }, [isOpen, initialCard, defaultDeckId, decks]);

  if (!isOpen) return null;

  // Insert cloze deletion syntax {{c1::selectedText}}
  const insertCloze = () => {
    const el = frontInputRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = front.substring(start, end) || 'text';

    // Count existing clozes to auto-increment c1, c2, c3
    const match = front.match(/\{\{c(\d+)::/g);
    const nextNum = match ? match.length + 1 : 1;

    const replacement = `{{c${nextNum}::${selectedText}}}`;
    const newFront = front.substring(0, start) + replacement + front.substring(end);
    setFront(newFront);
    setCardType('cloze');

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + 6, start + 6 + selectedText.length);
    }, 50);
  };

  const handleSave = () => {
    setErrorMessage(null);
    if (!front.trim()) {
      setErrorMessage(t.cardEditor.frontRequired);
      return;
    }

    const tags = tagInput
      .split(/[,،\s]+/)
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    onSaveCard({
      id: initialCard?.id,
      deckId,
      cardType,
      front: front.trim(),
      back: back.trim(),
      tags,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#1976D2] dark:bg-[#1a1a1a] text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-amber-300" />
            <h3 className="font-bold text-base">
              {initialCard ? t.cardEditor.editTitle : t.cardEditor.addTitle}
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

        {/* Tab switcher: Edit / Preview */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#252525] px-4 pt-2 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('edit')}
            className={`pb-2 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'edit'
                ? 'border-[#1976D2] text-[#1976D2] dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t.cardEditor.editTab}</span>
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-2 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'preview'
                ? 'border-[#1976D2] text-[#1976D2] dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t.cardEditor.previewTab}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'edit' ? (
            <>
              {errorMessage && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
                  {errorMessage}
                </div>
              )}

              {/* Deck & Type selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {t.cardEditor.deckLabel}
                  </label>
                  <select
                    value={deckId}
                    onChange={(e) => setDeckId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] text-gray-800 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {t.cardEditor.typeLabel}
                  </label>
                  <select
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value as CardType)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] text-gray-800 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="basic">{t.cardEditor.basicType}</option>
                    <option value="cloze">{t.cardEditor.clozeType}</option>
                    <option value="typeIn">{t.cardEditor.typeInType}</option>
                  </select>
                </div>
              </div>

              {/* Front Side Input with Toolbar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {t.cardEditor.frontLabel}
                  </label>

                  {/* Formatting Toolbar */}
                  <div className="flex items-center space-x-1 space-x-reverse rtl:space-x-reverse text-xs">
                    <button
                      type="button"
                      onClick={insertCloze}
                      className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded font-bold text-[11px] hover:bg-blue-100 transition-colors flex items-center gap-1"
                      title={t.cardEditor.clozeButton}
                    >
                      <span>[...]</span>
                      <span>Cloze</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => speakText(front)}
                      className="p-1 rounded text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                      title={t.cardEditor.audioTest}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <textarea
                  ref={frontInputRef}
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  rows={4}
                  placeholder={cardType === 'cloze' ? t.cardEditor.clozePlaceholder : t.cardEditor.frontPlaceholder}
                  className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                />
              </div>

              {/* Back Side Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {t.cardEditor.backLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => speakText(back)}
                    className="p-1 rounded text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
                    title={t.cardEditor.audioTest}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <textarea
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  rows={4}
                  placeholder={t.cardEditor.backPlaceholder}
                  className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                />
              </div>

              {/* Tags Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-gray-400" />
                  <span>{t.cardEditor.tagsLabel}</span>
                </label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder={t.cardEditor.tagsPlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </>
          ) : (
            /* Preview Mode */
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-gray-700 text-center">
                <span className="text-xs text-gray-400 font-bold block mb-2">{t.cardEditor.frontPreview}</span>
                <div
                  className="text-lg font-semibold text-gray-800 dark:text-gray-100"
                  dangerouslySetInnerHTML={{
                    __html: front.replace(
                      /\{\{c\d+::(.*?)(::.*?)?\}\}/g,
                      '<span class="cloze">[...]</span>'
                    ) || '<span class="text-gray-400">-</span>',
                  }}
                />
              </div>

              <div className="p-4 bg-gray-50 dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-gray-700 text-center">
                <span className="text-xs text-gray-400 font-bold block mb-2">{t.cardEditor.backPreview}</span>
                <div
                  className="text-base text-gray-700 dark:text-gray-200"
                  dangerouslySetInnerHTML={{
                    __html: back || front.replace(
                      /\{\{c\d+::(.*?)(::.*?)?\}\}/g,
                      '<span class="cloze font-bold">$1</span>'
                    ) || '<span class="text-gray-400">-</span>',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-gray-50 dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {t.cardEditor.cancel}
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-[#1976D2] hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{t.cardEditor.saveCard}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
