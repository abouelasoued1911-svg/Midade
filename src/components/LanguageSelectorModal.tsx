import React from 'react';
import { X, Globe, Check, Compass } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../i18n/translations';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { language, setLanguage, t } = useI18n();

  if (!isOpen) return null;

  const handleAutoDetect = () => {
    const navLangs = navigator.languages || [navigator.language];
    for (const l of navLangs) {
      const code = l.slice(0, 2).toLowerCase();
      if (SUPPORTED_LANGUAGES.some((opt) => opt.code === code)) {
        setLanguage(code as SupportedLanguage);
        onClose();
        return;
      }
    }
    setLanguage('en');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#1976D2] dark:bg-[#1a1a1a] text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-300" />
            <h3 className="font-bold text-base">{t.nav.language}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Auto detect button */}
          <button
            onClick={handleAutoDetect}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300 transition-colors text-xs sm:text-sm font-semibold"
          >
            <div className="flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Auto-detect from browser / region (تلقائي حسب لغة جهازك)</span>
            </div>
          </button>

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* Languages list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    onClose();
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-[#1976D2] bg-blue-50/70 dark:bg-blue-950/40 text-[#1976D2] dark:text-blue-300 font-bold shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#252525] text-gray-800 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl leading-none">{lang.flag}</span>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold">
                        {lang.nativeName}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 font-normal">
                        {lang.name}
                      </div>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-[#1976D2] dark:text-blue-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-gray-800 px-4 py-2.5 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-semibold"
          >
            {t.study.close}
          </button>
        </div>
      </div>
    </div>
  );
};
