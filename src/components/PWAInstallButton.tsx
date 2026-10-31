import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);

  // If already installed, don't show
  if (isInstalled) {
    return null;
  }

  // Trigger installation or open guide
  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowManualGuide(true);
    }
  };

  if (compact) {
    return (
      <>
        <button
          onClick={handleClick}
          title="تثبيت التطبيق على جهازك (PWA)"
          aria-label="تثبيت التطبيق"
          className="p-2 rounded-full hover:bg-white/15 active:bg-white/25 transition-colors text-amber-300 hover:text-white"
        >
          <Download className="w-5 h-5" />
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in select-none">
            <div className="w-full max-w-sm rounded-xl bg-white dark:bg-[#202020] p-5 shadow-2xl border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold flex items-center gap-2 text-[#1976D2]">
                  <Smartphone className="w-5 h-5" />
                  <span>تثبيت AnkiDroid على الآيفون والآيباد</span>
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                <p>1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح Safari أسفل الشاشة.</p>
                <p>2. مرر للأسفل واضغط على <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.</p>
                <p>3. اضغط على <strong>إضافة (Add)</strong> بالأعلى لتثبيت التطبيق وتشغيله بدون متصفح.</p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-[#1976D2] py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                فهمت ذلك
              </button>
            </div>
          </div>
        )}

        {showManualGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in select-none">
            <div className="w-full max-w-sm rounded-xl bg-white dark:bg-[#202020] p-5 shadow-2xl border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold flex items-center gap-2 text-[#1976D2]">
                  <Download className="w-5 h-5" />
                  <span>تثبيت تطبيق AnkiDroid</span>
                </h3>
                <button
                  onClick={() => setShowManualGuide(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                يمكنك تثبيت هذا التطبيق على جهاز الكمبيوتر أو هاتف أندرويد عبر قائمة المتصفح (ثلاث نقاط بالأعلى) ثم اختيار <strong>"تثبيت التطبيق" (Install App)</strong> أو <strong>"الإضافة إلى الشاشة الرئيسية"</strong>.
              </p>

              <button
                onClick={() => setShowManualGuide(false)}
                className="w-full rounded-lg bg-[#1976D2] py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                حسناً
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold bg-blue-50 dark:bg-blue-950/40 text-[#1976D2] dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Download className="w-5 h-5" />
        <span>تثبيت التطبيق (PWA)</span>
      </div>
      <span className="text-[10px] bg-[#1976D2] text-white px-2 py-0.5 rounded-full font-bold">
        تثبيت
      </span>
    </button>
  );
};
