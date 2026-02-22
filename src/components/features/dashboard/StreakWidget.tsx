'use client';

import { Flame, BookOpen, Target, TrendingUp } from 'lucide-react';

interface StreakWidgetProps {
  data: {
    streak: number;
    todayCards: number;
    weekCards: number;
    accuracyRate: number | null;
  };
}

export function StreakWidget({ data }: StreakWidgetProps) {
  return (
    <div className="rounded-xl border border-border-primary bg-surface-primary p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        {/* Streak - prominent */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{
              backgroundColor: data.streak > 0
                ? 'color-mix(in srgb, var(--chart-streak) 15%, transparent)'
                : 'var(--surface-secondary)',
            }}
          >
            <Flame
              className="w-6 h-6"
              style={{ color: data.streak > 0 ? 'var(--chart-streak)' : 'var(--text-tertiary)' }}
              aria-hidden
            />
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary leading-none">
              {data.streak}
            </div>
            <div className="text-xs text-text-tertiary mt-1">
              day{data.streak !== 1 ? 's' : ''} streak
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px self-stretch bg-border-primary shrink-0" aria-hidden />
        <div className="sm:hidden h-px w-full bg-border-primary shrink-0" aria-hidden />

        {/* Sub-stats */}
        <div className="flex gap-4 sm:gap-6 sm:ml-auto">
          <div className="text-left sm:text-right flex-1 sm:flex-initial">
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary mb-1 sm:justify-end">
              <BookOpen className="w-3.5 h-3.5 shrink-0" aria-hidden />
              today
            </div>
            <div className="text-base font-semibold text-text-primary">{data.todayCards}</div>
          </div>

          <div className="text-left sm:text-right flex-1 sm:flex-initial">
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary mb-1 sm:justify-end">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden />
              this week
            </div>
            <div className="text-base font-semibold text-text-primary">{data.weekCards}</div>
          </div>

          {data.accuracyRate !== null && (
            <div className="text-left sm:text-right flex-1 sm:flex-initial">
              <div className="flex items-center gap-1.5 text-xs text-text-tertiary mb-1 sm:justify-end">
                <Target className="w-3.5 h-3.5 shrink-0" aria-hidden />
                accuracy
              </div>
              <div className="text-base font-semibold text-text-primary">{data.accuracyRate}%</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
