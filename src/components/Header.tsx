import React, { useState } from 'react';
import {
  Menu,
  RotateCw,
  Search,
  Moon,
  Sun,
  MoreVertical,
  BarChart3,
  Download,
  BookOpen,
  Cloud,
  Globe
} from 'lucide-react';
import { FirebaseUser } from '../firebase';
import { SyncState } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { useI18n } from '../i18n/context';

interface HeaderProps {
  onToggleDrawer: () => void;
  onOpenCardBrowser: () => void;
  onOpenStats: () => void;
  onOpenImportExport: () => void;
  onOpenSyncModal: () => void;
  onOpenLanguageModal: () => void;
  onManualSync: () => void;
  onGoHome: () => void;
  syncState: SyncState;
  lastSyncTime: string | null;
  currentUser: FirebaseUser | null;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleDrawer,
  onOpenCardBrowser,
  onOpenStats,
  onOpenImportExport,
  onOpenSyncModal,
  onOpenLanguageModal,
  onManualSync,
  onGoHome,
  syncState,
  currentUser,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const { t, currentLanguageOption } = useI18n();
  const base = (import.meta.env?.BASE_URL || './').replace(/\/$/, '') + '/';
  const brandIcon = `${base}assets/aistudio/icon_ca03839c.jpg`;

  return (
    <header className="sticky top-0 z-30 bg-[#1976D2] dark:bg-[#1a1a1a] text-white shadow-md select-none transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
        {/* Left: Drawer toggle and midade Logo & Title */}
        <div className="flex items-center space-x-2 space-x-reverse rtl:space-x-reverse">
          <button
            onClick={onToggleDrawer}
            aria-label="Menu"
            className="p-2 -mx-1 rounded-full hover:bg-white/15 active:bg-white/25 transition-colors focus:outline-none"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={onGoHome}
            title={t.deckList.deckHeader}
          >
            {/* User-supplied midade Brand Image */}
            <img
              src={brandIcon}
              alt="midade"
              className="w-8 h-8 rounded-lg object-cover shadow-sm border border-white/30"
            />
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight flex items-center gap-1.5">
                <span>midade</span>
                <span className="text-[10px] font-medium bg-white/20 px-1.5 py-0.5 rounded text-blue-100">
                  {t.cloudSync}
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Right action icons */}
        <div className="flex items-center space-x-1 space-x-reverse rtl:space-x-reverse">
          {/* Language Switcher Button */}
          <button
            onClick={onOpenLanguageModal}
            title={t.nav.language}
            aria-label="Language"
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/15 active:bg-white/25 transition-colors text-xs font-semibold"
          >
            <Globe className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline text-xs">{currentLanguageOption.flag}</span>
          </button>

          {/* PWA Download / Install App Button */}
          <PWAInstallButton compact={true} />

          {/* Search / Card browser */}
          <button
            onClick={onOpenCardBrowser}
            title={t.browser.title}
            aria-label="Search"
            className="p-2 rounded-full hover:bg-white/15 active:bg-white/25 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Sync Button with status */}
          <button
            onClick={currentUser ? onManualSync : onOpenSyncModal}
            title={
              currentUser
                ? `${t.sync.title} (${syncState === 'syncing' ? t.sync.syncing : t.sync.syncNow})`
                : t.sync.signInTitle
            }
            aria-label="Sync"
            className="p-2 rounded-full hover:bg-white/15 active:bg-white/25 transition-colors relative"
          >
            <RotateCw
              className={`w-5 h-5 ${syncState === 'syncing' ? 'animate-spin text-amber-300' : ''}`}
            />
            {currentUser && syncState === 'synced' && (
              <span className="absolute bottom-1.5 left-1.5 w-2 h-2 bg-emerald-400 rounded-full ring-1 ring-white" />
            )}
            {currentUser && syncState === 'error' && (
              <span className="absolute bottom-1.5 left-1.5 w-2 h-2 bg-rose-400 rounded-full ring-1 ring-white" />
            )}
          </button>

          {/* Dark mode switch */}
          <button
            onClick={onToggleDarkMode}
            title={t.nav.nightMode}
            aria-label="Night Mode"
            className="p-2 rounded-full hover:bg-white/15 active:bg-white/25 transition-colors"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User profile / Cloud status button */}
          <button
            onClick={onOpenSyncModal}
            title={currentUser ? `${currentUser.email}` : t.sync.signInTitle}
            aria-label="Account"
            className="p-1 rounded-full hover:bg-white/15 transition-colors flex items-center"
          >
            {currentUser ? (
              currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt=""
                  className="w-7 h-7 rounded-full ring-2 ring-white/50 object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-xs shadow-inner">
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
              )
            ) : (
              <div className="p-1 text-blue-100 hover:text-white">
                <Cloud className="w-5 h-5" />
              </div>
            )}
          </button>

          {/* 3-dots Overflow Menu */}
          <div className="relative">
            <button
              onClick={() => setShowOverflowMenu(!showOverflowMenu)}
              aria-label="Options"
              className="p-2 rounded-full hover:bg-white/15 active:bg-white/25 transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showOverflowMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowOverflowMenu(false)}
                />
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-1 w-56 bg-white dark:bg-[#252525] text-gray-800 dark:text-gray-100 rounded-lg shadow-xl border border-gray-100 dark:border-gray-800 py-1 z-50 text-sm animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      setShowOverflowMenu(false);
                      onOpenCardBrowser();
                    }}
                    className="w-full text-start px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
                  >
                    <BookOpen className="w-4 h-4 text-[#1976D2] dark:text-blue-400" />
                    <span>{t.nav.browser}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowOverflowMenu(false);
                      onOpenStats();
                    }}
                    className="w-full text-start px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
                  >
                    <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t.nav.stats}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowOverflowMenu(false);
                      onOpenImportExport();
                    }}
                    className="w-full text-start px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
                  >
                    <Download className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>{t.nav.importExport}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowOverflowMenu(false);
                      onOpenLanguageModal();
                    }}
                    className="w-full text-start px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3 text-amber-600 dark:text-amber-400"
                  >
                    <Globe className="w-4 h-4" />
                    <span>{t.nav.language} ({currentLanguageOption.nativeName})</span>
                  </button>

                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

                  <button
                    onClick={() => {
                      setShowOverflowMenu(false);
                      onOpenSyncModal();
                    }}
                    className="w-full text-start px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
                  >
                    <Cloud className="w-4 h-4 text-sky-500" />
                    <span>{t.nav.sync}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
