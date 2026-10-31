import React, { useMemo } from 'react';
import {
  X,
  BarChart3,
  Calendar,
  Layers,
} from 'lucide-react';
import { Card, Deck, ReviewLog } from '../types';
import { useI18n } from '../i18n/context';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: Card[];
  decks: Deck[];
  reviews: ReviewLog[];
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  cards,
  reviews,
}) => {
  const { t, language } = useI18n();

  // Compute statistics
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayReviews = reviews.filter((r) => new Date(r.reviewedAt).toDateString() === today);

    const todayCount = todayReviews.length;
    const todayTimeSec = todayReviews.reduce((sum, r) => sum + (r.timeSpentSeconds || 0), 0);
    const todayGoodOrEasy = todayReviews.filter((r) => r.rating >= 3).length;
    const retentionRate = todayCount > 0 ? Math.round((todayGoodOrEasy / todayCount) * 100) : 100;

    let newCards = 0;
    let learningCards = 0;
    let youngCards = 0; // interval < 21 days
    let matureCards = 0; // interval >= 21 days
    let suspendedCards = 0;

    cards.forEach((c) => {
      if (c.isSuspended) {
        suspendedCards++;
      } else if (c.state === 'new') {
        newCards++;
      } else if (c.state === 'learning' || c.state === 'relearning') {
        learningCards++;
      } else if (c.state === 'review') {
        if ((c.interval || 0) >= 21) {
          matureCards++;
        } else {
          youngCards++;
        }
      }
    });

    // 7-day forecast
    const forecast: { dayLabel: string; count: number }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const targetDayStr = targetDate.toDateString();

      const dueOnThisDay = cards.filter((c) => {
        if (c.isSuspended || c.state === 'new') return false;
        return new Date(c.dueDate).toDateString() === targetDayStr;
      }).length;

      let label = targetDate.toLocaleDateString(language, { weekday: 'short' });
      if (i === 0) label = t.stats.today;
      if (i === 1) label = t.stats.tomorrow;

      forecast.push({
        dayLabel: label,
        count: dueOnThisDay,
      });
    }

    const maxForecastCount = Math.max(1, ...forecast.map((f) => f.count));

    return {
      todayCount,
      todayTimeMin: Math.round(todayTimeSec / 60),
      retentionRate,
      newCards,
      learningCards,
      youngCards,
      matureCards,
      suspendedCards,
      totalCards: cards.length,
      forecast,
      maxForecastCount,
    };
  }, [cards, reviews, language, t]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#1976D2] dark:bg-[#1a1a1a] text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">{t.stats.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Today Overview Banner */}
          <div className="grid grid-cols-3 gap-2 text-center bg-blue-50/60 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40">
            <div>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold block">
                {t.stats.todayReviews}
              </span>
              <span className="text-xl font-black text-[#1976D2] dark:text-blue-400">
                {stats.todayCount}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold block">
                {t.stats.timeSpent}
              </span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {stats.todayTimeMin} {t.stats.minutes}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold block">
                {t.stats.retentionRate}
              </span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                {stats.retentionRate}%
              </span>
            </div>
          </div>

          {/* Cards Breakdown by State */}
          <div className="bg-white dark:bg-[#252525] p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-500" />
              <span>{t.stats.cardsMaturity}</span>
            </h4>

            {/* Visual Stacked Bar */}
            <div className="h-4 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex mb-3">
              {stats.totalCards > 0 && (
                <>
                  <div
                    style={{ width: `${(stats.newCards / stats.totalCards) * 100}%` }}
                    className="bg-blue-500 h-full"
                    title={`${t.stats.new}: ${stats.newCards}`}
                  />
                  <div
                    style={{ width: `${(stats.learningCards / stats.totalCards) * 100}%` }}
                    className="bg-rose-500 h-full"
                    title={`${t.stats.learning}: ${stats.learningCards}`}
                  />
                  <div
                    style={{ width: `${(stats.youngCards / stats.totalCards) * 100}%` }}
                    className="bg-amber-500 h-full"
                    title={`${t.stats.young}: ${stats.youngCards}`}
                  />
                  <div
                    style={{ width: `${(stats.matureCards / stats.totalCards) * 100}%` }}
                    className="bg-emerald-500 h-full"
                    title={`${t.stats.mature}: ${stats.matureCards}`}
                  />
                </>
              )}
            </div>

            {/* Legend Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-1.5 rounded bg-gray-50 dark:bg-[#1f1f1f]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-gray-600 dark:text-gray-300">{t.stats.new}</span>
                </div>
                <span className="font-bold text-gray-800 dark:text-gray-100">{stats.newCards}</span>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded bg-gray-50 dark:bg-[#1f1f1f]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-gray-600 dark:text-gray-300">{t.stats.learning}</span>
                </div>
                <span className="font-bold text-gray-800 dark:text-gray-100">{stats.learningCards}</span>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded bg-gray-50 dark:bg-[#1f1f1f]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-gray-600 dark:text-gray-300">{t.stats.young}</span>
                </div>
                <span className="font-bold text-gray-800 dark:text-gray-100">{stats.youngCards}</span>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded bg-gray-50 dark:bg-[#1f1f1f]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-gray-600 dark:text-gray-300">{t.stats.mature}</span>
                </div>
                <span className="font-bold text-gray-800 dark:text-gray-100">{stats.matureCards}</span>
              </div>
            </div>
          </div>

          {/* 7-Day Forecast */}
          <div className="bg-white dark:bg-[#252525] p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>{t.stats.forecastTitle}</span>
            </h4>

            <div className="flex items-end justify-between h-28 gap-2 pt-4 px-2 border-b border-gray-200 dark:border-gray-700">
              {stats.forecast.map((f, idx) => {
                const heightPercent = Math.max(12, Math.round((f.count / stats.maxForecastCount) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      {f.count}
                    </span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-md transition-all ${
                        idx === 0
                          ? 'bg-[#1976D2] dark:bg-blue-500'
                          : 'bg-blue-300 dark:bg-blue-800 hover:bg-blue-400'
                      }`}
                    />
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[42px] text-center">
                      {f.dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#1976D2] hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
          >
            {t.stats.close}
          </button>
        </div>
      </div>
    </div>
  );
};
