import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
  TranslationDictionary,
  LanguageOption,
} from './translations';

interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: TranslationDictionary;
  currentLanguageOption: LanguageOption;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_LANG_KEY = 'midade_language_v1';

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    // Check saved preference first
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY);
      if (saved && Object.keys(TRANSLATIONS).includes(saved)) {
        return saved as SupportedLanguage;
      }
    } catch (e) {
      // ignore
    }
    // Per explicit user brief: "وان تكون الواجهة في البداية بالانجليزية" (Interface initially in English)
    return 'en';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_LANG_KEY, lang);
    } catch (e) {
      // ignore
    }
  };

  const currentLanguageOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const isRTL = currentLanguageOption.dir === 'rtl';

  // Sync document lang, dir, and title on language change
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = currentLanguageOption.dir;
    document.title = `midade - ${TRANSLATIONS[language].tagline}`;
  }, [language, currentLanguageOption]);

  const value = {
    language,
    setLanguage,
    t: TRANSLATIONS[language] || TRANSLATIONS.en,
    currentLanguageOption,
    isRTL,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
