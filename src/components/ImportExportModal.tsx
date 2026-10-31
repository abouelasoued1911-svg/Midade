import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  FileText,
  Loader2,
  Package,
  CheckCircle2,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import { Card, Deck, ReviewLog } from '../types';
import { useI18n } from '../i18n/context';
import { parseApkgFile } from '../services/apkgParser';
import { parseFlashcardCsv, formatCsv } from '../utils/csvParser';
import { generateId } from '../utils/id';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  decks: Deck[];
  cards: Card[];
  reviews?: ReviewLog[];
  onImportDecksAndCards: (newDecks: Deck[], newCards: Card[]) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  decks,
  cards,
  reviews = [],
  onImportDecksAndCards,
}) => {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string>('');
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    deckCount?: number;
    cardCount?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Export full JSON backup package (Version 2 with reviews history)
  const handleExportJSON = () => {
    const backupData = {
      version: 2,
      schema: 'midade-backup-v2',
      exportedAt: new Date().toISOString(),
      decks,
      cards,
      reviews,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `midade_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export RFC 4180 compliant TSV text format
  const handleExportTSV = () => {
    const rows = [
      ['Front', 'Back', 'Tags', 'Type'],
      ...cards.map((c) => [
        c.front,
        c.back,
        c.tags?.join(' ') || '',
        c.cardType || 'basic',
      ]),
    ];

    const tsvContent = formatCsv(rows, '\t');
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `midade_cards_${new Date().toISOString().slice(0, 10)}.tsv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Process selected or dropped file
  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setImportResult(null);

    const fileName = file.name.toLowerCase();

    try {
      // 1. Anki Package (.apkg)
      if (fileName.endsWith('.apkg')) {
        setLoadingText('جاري فك حزمة Anki وقراءة قاعدة البيانات والوسائط...');
        const fallbackDeckName = file.name.replace(/\.apkg$/i, '');
        const result = await parseApkgFile(file, fallbackDeckName);

        if (result.cards.length === 0) {
          throw new Error('لم يتم العثور على أي بطاقات قابلة للاستيراد في ملف Anki هذا.');
        }

        onImportDecksAndCards(result.decks, result.cards);
        setImportResult({
          success: true,
          message: `تم استيراد حزمة "${file.name}" بنجاح!`,
          deckCount: result.decks.length,
          cardCount: result.cards.length,
        });
        return;
      }

      // 2. JSON Backup file (V1 or V2)
      if (fileName.endsWith('.json')) {
        setLoadingText('جاري قراءة ملف النسخة الاحتياطية JSON...');
        const text = await file.text();
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error('الملف ليس بصيغة JSON صالحة.');
        }

        if (Array.isArray(parsed.decks) && Array.isArray(parsed.cards)) {
          // Validate items have necessary fields
          const validDecks: Deck[] = parsed.decks.filter((d: any) => d && d.id && d.name);
          const validCards: Card[] = parsed.cards.filter((c: any) => c && c.id && c.front);

          onImportDecksAndCards(validDecks, validCards);
          setImportResult({
            success: true,
            message: `تم استعادة ${validDecks.length} رزمة و ${validCards.length} بطاقة بنجاح!`,
            deckCount: validDecks.length,
            cardCount: validCards.length,
          });
          return;
        }
        throw new Error('بنية ملف JSON غير متوافقة: يجب أن يحتوي على مصفوفة "decks" و "cards".');
      }

      // 3. RFC 4180 Compliant CSV / TSV / TXT
      setLoadingText('جاري تحليل ملف البطاقات النصية بدقة...');
      const text = await file.text();
      const parsedRows = parseFlashcardCsv(text);

      if (parsedRows.length === 0) {
        throw new Error('لم يتم العثور على بطاقات صالحة في الملف. تأكد من احتواء الملف على عمودين على الأقل (السؤال والجواب).');
      }

      const targetDeck: Deck = decks[0] || {
        id: generateId('deck-imported'),
        userId: 'local',
        name: file.name.replace(/\.[^/.]+$/, '') || 'Imported Deck',
        newCardsPerDay: 20,
        reviewCardsPerDay: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const now = new Date().toISOString();
      const importedCards: Card[] = parsedRows.map((row, idx) => ({
        id: generateId(`card-csv-${idx}`),
        userId: 'local',
        deckId: targetDeck.id,
        front: row.front,
        back: row.back,
        cardType: row.cardType || 'basic',
        tags: row.tags,
        state: 'new',
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        dueDate: now,
        createdAt: now,
        updatedAt: now,
      }));

      const deckList = decks.some((d) => d.id === targetDeck.id)
        ? decks
        : [...decks, targetDeck];

      onImportDecksAndCards(deckList, [...cards, ...importedCards]);
      setImportResult({
        success: true,
        message: `تم استيراد ${importedCards.length} بطاقة بنجاح إلى رزمة "${targetDeck.name}"!`,
        deckCount: 1,
        cardCount: importedCards.length,
      });
    } catch (err: any) {
      setError(err?.message || 'فشل في استيراد الملف.');
    } finally {
      setIsLoading(false);
      setLoadingText('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#1976D2] dark:bg-[#1a1a1a] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-300" />
            <h3 className="font-bold text-base">{t.importExport.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Status / Success Banner */}
          {importResult && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">{importResult.message}</p>
                {importResult.deckCount !== undefined && (
                  <p className="text-[11px] opacity-90">
                    {importResult.deckCount} رزمة • {importResult.cardCount} بطاقة جاهزة للدراسة!
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="font-medium">{error}</div>
            </div>
          )}

          {/* Import Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>{t.importExport.importTitle}</span>
              </h4>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full font-bold">
                .apkg supported
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {t.importExport.importDesc}
            </p>

            {/* Supported format badges */}
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded font-semibold flex items-center gap-1">
                <Package className="w-3 h-3" /> .apkg (Anki)
              </span>
              <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded font-semibold flex items-center gap-1">
                <FileCode className="w-3 h-3" /> .json
              </span>
              <span className="px-2 py-0.5 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded font-semibold flex items-center gap-1">
                <FileText className="w-3 h-3" /> .tsv / .csv / .txt
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".apkg,.json,.txt,.tsv,.csv"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Dropzone / Upload button */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isLoading && fileInputRef.current?.click()}
              className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-150 ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.01]'
                  : 'border-gray-300 dark:border-gray-700 hover:border-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              {isLoading ? (
                <div className="py-2 flex flex-col items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span className="text-xs font-semibold">{loadingText || 'Processing file...'}</span>
                </div>
              ) : (
                <div className="py-1 flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    {t.importExport.selectFile}
                  </div>
                  <span className="text-[11px] text-gray-400">
                    اسحب وأفلت الملف هنا أو انقر للاختيار (.apkg, .json, .csv, .tsv)
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* Export Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-purple-500" />
              <span>{t.importExport.exportTitle}</span>
            </h4>
            <p className="text-xs text-gray-500">
              {t.importExport.exportDesc} ({decks.length} رزمة، {cards.length} بطاقة)
            </p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleExportJSON}
                className="flex-1 py-2 px-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{t.importExport.exportJson} (v2)</span>
              </button>
              <button
                onClick={handleExportTSV}
                className="flex-1 py-2 px-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t.importExport.exportTsv}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-gray-800 px-4 py-2.5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer"
          >
            {t.importExport.close}
          </button>
        </div>
      </div>
    </div>
  );
};
