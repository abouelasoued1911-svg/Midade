import React from 'react';
import { AlertTriangle, Trash2, RotateCcw, X, Check } from 'lucide-react';

import { useI18n } from '../i18n/context';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useI18n();
  const effectiveConfirmText = confirmText || t.confirm.confirm;
  const effectiveCancelText = cancelText || t.confirm.cancel;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in">
      <div className="bg-white dark:bg-[#202020] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isDestructive
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                  : 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="flex-1">
              <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 mb-1">
                {title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-[#181818] border-t border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {effectiveCancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-white ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-[#1976D2] hover:bg-blue-700'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{effectiveConfirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
