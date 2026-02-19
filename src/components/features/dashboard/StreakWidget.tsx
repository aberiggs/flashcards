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
      <div className="flex items-center gap-6">
        {/* Streak display */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: data.streak > 0
                ? 'color-mix(in srgb, var(--chart-streak) 15%, transparent)'
                : 'var(--surface-secondary)',
            }}
          >
            <Flame
              className="w-6 h-6"
              style={{
                color: data.streak > 0
                  ? 'var(--chart-streak)'
                  : 'var(--text-tertiary)',
              }}
              aria-hidden
            />
          </div>
          <div>
            <div className="text-3xl font-bold text-text-primary">
              {data.streak}
            </div>
            <div className="text-xs text-text-tertiary">
              day{data.streak !== 1 ? 's' : ''} streak
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-12 bg-border-primary shrink-0" aria-hidden />

        {/* Sub-stats */}
        <div className="flex gap-5 flex-wrap">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-text-tertiary" aria-hidden />
            <div>
              <div className="text-sm font-semibold text-text-primary">
                {data.todayCards}
              </div>
              <div className="text-xs text-text-tertiary">today</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-text-tertiary" aria-hidden />
            <div>
              <div className="text-sm font-semibold text-text-primary">
                {data.weekCards}
              </div>
              <div className="text-xs text-text-tertiary">this week</div>
            </div>
          </div>
          {data.accuracyRate !== null && (
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-text-tertiary" aria-hidden />
              <div>
                <div className="text-sm font-semibold text-text-primary">
                  {data.accuracyRate}%
                </div>
                <div className="text-xs text-text-tertiary">accuracy</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
