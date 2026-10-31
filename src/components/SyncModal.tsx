import React, { useState } from 'react';
import {
  X,
  Cloud,
  CheckCircle,
  AlertCircle,
  RotateCw,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { FirebaseUser } from '../firebase';
import { SyncState } from '../types';
import { useI18n } from '../i18n/context';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  onSignInWithGoogle: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onPerformSync: () => Promise<void>;
  syncState: SyncState;
  lastSyncTime: string | null;
  decksCount: number;
  cardsCount: number;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSignInWithGoogle,
  onSignOut,
  onPerformSync,
  syncState,
  lastSyncTime,
  decksCount,
  cardsCount,
}) => {
  const { t, language } = useI18n();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await onSignInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await onSignOut();
    } catch (err: any) {
      setErrorMsg(err.message || 'Sign out failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await onPerformSync();
    } catch (err: any) {
      setErrorMsg(err.message || 'Sync failed');
    } finally {
      setLoading(false);
    }
  };

  const formatLastSync = (iso: string | null) => {
    if (!iso) return t.sync.neverSynced;
    try {
      const date = new Date(iso);
      return date.toLocaleString(language, {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch (e) {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#1976D2] dark:bg-[#1a1a1a] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-sky-300" />
            <h3 className="font-bold text-base">{t.sync.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {currentUser ? (
            /* Logged in state */
            <div className="space-y-4">
              {/* User Card */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-gray-700">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#1976D2] text-white font-bold flex items-center justify-center text-lg">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}

                <div className="flex-1 overflow-hidden">
                  <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">
                    {currentUser.displayName || 'midade User'}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {currentUser.email}
                  </p>
                  <span className="inline-block mt-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                    {t.sync.synced}
                  </span>
                </div>
              </div>

              {/* Sync Status Info */}
              <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">{t.sync.statusLabel}:</span>
                  <span className="font-bold flex items-center gap-1.5 text-[#1976D2] dark:text-blue-400">
                    {syncState === 'syncing' ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{t.sync.syncing}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{t.sync.synced}</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">{t.sync.lastSyncLabel}:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {formatLastSync(lastSyncTime)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">{t.sync.localDataLabel}:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {decksCount} / {cardsCount} {t.sync.decksAndCards}
                  </span>
                </div>
              </div>

              {/* Free Tier Guarantee Badge */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5 text-emerald-800 dark:text-emerald-300 text-xs">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <p className="leading-relaxed">
                  {t.sync.freeNotice}
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleSyncNow}
                  disabled={loading}
                  className="w-full py-2.5 bg-[#1976D2] hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>{t.sync.syncNow}</span>
                </button>

                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.sync.signOut}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Logged out state */
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-950/50 text-[#1976D2] dark:text-blue-400 rounded-full flex items-center justify-center mx-auto">
                <Cloud className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-bold text-base text-gray-800 dark:text-gray-100 mb-1">
                  {t.sync.signInTitle}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
                  {t.sync.signInDesc}
                </p>
              </div>

              {/* Free Tier Guarantee Badge */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 text-start text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{t.sync.freeGuarantee}</span>
              </div>

              {/* Google Sign-in Button */}
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full py-3 bg-white hover:bg-gray-50 dark:bg-[#252525] dark:hover:bg-[#2a2a2a] text-gray-800 dark:text-gray-100 font-bold rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm transition-all flex items-center justify-center gap-3 text-sm active:scale-98 cursor-pointer"
              >
                {/* Google "G" logo */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? t.sync.signingIn : t.sync.signInGoogle}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-gray-800 px-4 py-2.5 flex items-center justify-between text-xs text-gray-500">
          <span>{t.sync.offlineNotice}</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-gray-200 rounded font-semibold"
          >
            {t.sync.close}
          </button>
        </div>
      </div>
    </div>
  );
};
