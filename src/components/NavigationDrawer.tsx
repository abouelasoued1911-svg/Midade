import React from 'react';
import {
  Layers,
  BookOpen,
  BarChart3,
  PlusCircle,
  FolderPlus,
  Cloud,
  Download,
  Moon,
  Sun,
  X,
  Sparkles,
  Globe
} from 'lucide-react';
import { FirebaseUser } from '../firebase';
import { PWAInstallButton } from './PWAInstallButton';
import { useI18n } from '../i18n/context';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: 'decks' | 'browser' | 'stats' | 'sync' | 'importExport') => void;
  onOpenAddCard: () => void;
  onOpenCreateDeck: () => void;
  onOpenLanguageModal: () => void;
  currentUser: FirebaseUser | null;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onOpenAddCard,
  onOpenCreateDeck,
  onOpenLanguageModal,
  currentUser,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const { t, currentLanguageOption, isRTL } = useI18n();
  const base = (import.meta.env?.BASE_URL || './').replace(/\/$/, '') + '/';
  const brandIcon = `${base}assets/aistudio/icon_ca03839c.jpg`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div
        className={`relative w-72 max-w-[80vw] h-full bg-white dark:bg-[#1a1a1a] text-gray-800 dark:text-gray-100 shadow-2xl flex flex-col z-10 animate-in duration-200 ${
          isRTL ? 'slide-in-from-right mr-auto' : 'slide-in-from-left ml-auto'
        }`}
      >
        {/* Drawer Header with midade banner */}
        <div className="p-4 bg-[#1976D2] dark:bg-[#151515] text-white flex flex-col justify-end min-h-[140px] relative">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 rtl:right-auto rtl:left-3 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <img
            src={brandIcon}
            alt="midade"
            className="w-12 h-12 rounded-xl object-cover shadow-md border-2 border-white/30 mb-2"
          />

          <h2 className="font-bold text-lg leading-tight">midade</h2>
          <p className="text-xs text-blue-100 truncate mt-0.5">
            {currentUser ? currentUser.email : t.notConnected}
          </p>
        </div>

        {/* Drawer Menu Items */}
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-3 py-1">
            <button
              onClick={() => {
                onSelectTab('decks');
                onClose();
              }}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors text-start"
            >
              <Layers className="w-5 h-5 text-[#1976D2]" />
              <span>{t.nav.decks}</span>
            </button>

            <button
              onClick={() => {
                onSelectTab('browser');
                onClose();
              }}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors text-start"
            >
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <span>{t.nav.browser}</span>
            </button>

            <button
              onClick={() => {
                onSelectTab('stats');
                onClose();
              }}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors text-start"
            >
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              <span>{t.nav.stats}</span>
            </button>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 my-1" />

          {/* Quick Actions */}
          <div className="px-3 py-1">
            <button
              onClick={() => {
                onOpenAddCard();
                onClose();
              }}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors text-start"
            >
              <PlusCircle className="w-5 h-5 text-amber-500" />
              <span>{t.nav.addCard}</span>
            </button>

            <button
              onClick={() => {
                onOpenCreateDeck();
                onClose();
              }}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors text-start"
            >
              <FolderPlus className="w-5 h-5 text-teal-500" />
              <span>{t.nav.createDeck}</span>
            </button>

            <button
              onClick={() => {
                onSelectTab('sync');
                onClose();
              }}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors text-start"
            >
              <Cloud className="w-5 h-5 text-sky-500" />
              <div className="flex-1 flex items-center justify-between">
                <span>{t.nav.sync}</span>
                {currentUser && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              </div>
            </button>

            <button
              onClick={() => {
                onSelectTab('importExport');
                onClose();
              }}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors text-start"
            >
              <Download className="w-5 h-5 text-purple-500" />
              <span>{t.nav.importExport}</span>
            </button>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 my-1" />

          {/* Theme, Language & Install */}
          <div className="px-3 py-1 space-y-1">
            <button
              onClick={() => {
                onOpenLanguageModal();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors text-start"
            >
              <div className="flex items-center gap-3.5">
                <Globe className="w-5 h-5 text-indigo-500" />
                <span>{t.nav.language}</span>
              </div>
              <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                {currentLanguageOption.flag} {currentLanguageOption.name}
              </span>
            </button>

            <div className="pt-0.5">
              <PWAInstallButton />
            </div>

            <button
              onClick={onToggleDarkMode}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors text-start"
            >
              <div className="flex items-center gap-3.5">
                {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
                <span>{t.nav.nightMode}</span>
              </div>
              <span className="text-xs text-gray-400">{isDarkMode ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#151515] text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.nav.sm2Algorithm}</span>
          </div>
          <span className="font-mono">{t.nav.version}</span>
        </div>
      </div>
    </div>
  );
};
