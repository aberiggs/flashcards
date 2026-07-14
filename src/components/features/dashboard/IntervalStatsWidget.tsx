'use client';

import { useRef, useState, KeyboardEvent } from 'react';
import { BookOpen, Layers, Target, TrendingUp, TrendingDown } from 'lucide-react';

export interface IntervalStats {
  sessions: number;
  cardsReviewed: number;
  cardsCorrect: number;
  accuracyRate: number | null;
  prevCardsReviewed: number;
  cardsDeltaPct: number | null;
}

export type IntervalKey = '1w' | '1m' | '1y';

export type IntervalStatsResponse = Record<IntervalKey, IntervalStats>;

interface IntervalStatsWidgetProps {
  data: IntervalStatsResponse;
}

const INTERVAL_KEYS: IntervalKey[] = ['1w', '1m', '1y'];
const INTERVAL_LABELS: Record<IntervalKey, string> = {
  '1w': '1 week',
  '1m': '1 month',
  '1y': '1 year',
};

function DeltaPct({ value, cardsReviewed }: { value: number | null; cardsReviewed: number }) {
  if (cardsReviewed === 0 || value === null) {
    return <span className="text-lg font-semibold text-text-tertiary before:content-['—']" aria-label="no data" />;
  }
  const positive = value > 0;
  const negative = value < 0;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : null;
  const color = positive
    ? 'var(--accent-success)'
    : negative
      ? 'var(--accent-error)'
      : 'var(--text-secondary)';
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color }}>
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />}
      {positive ? '+' : ''}{value}%
    </span>
  );
}

export function IntervalStatsWidget({ data }: IntervalStatsWidgetProps) {
  const [active, setActive] = useState<IntervalKey>('1w');
  const tabRefs = useRef<Record<IntervalKey, HTMLButtonElement | null>>({
    '1w': null,
    '1m': null,
    '1y': null,
  });

  const stats = data[active];

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = INTERVAL_KEYS.indexOf(active);
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIdx = (idx + 1) % INTERVAL_KEYS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIdx = (idx - 1 + INTERVAL_KEYS.length) % INTERVAL_KEYS.length;
    } else if (e.key === 'Home') {
      nextIdx = 0;
    } else if (e.key === 'End') {
      nextIdx = INTERVAL_KEYS.length - 1;
    }
    if (nextIdx === null) return;
    e.preventDefault();
    const nextKey = INTERVAL_KEYS[nextIdx];
    setActive(nextKey);
    tabRefs.current[nextKey]?.focus();
  };

  return (
    <div className="rounded-xl border border-border-primary bg-surface-primary p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-text-primary">
          Study stats
        </h3>
        <div
          role="tablist"
          aria-label="Study stats interval"
          className="inline-flex rounded-lg border border-border-primary bg-surface-secondary p-0.5 text-xs"
          onKeyDown={handleKeyDown}
        >
          {INTERVAL_KEYS.map((key) => {
            const selected = key === active;
            return (
              <button
                key={key}
                ref={(el) => {
                  tabRefs.current[key] = el;
                }}
                role="tab"
                type="button"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(key)}
                className={`px-3 py-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary ${
                  selected
                    ? 'bg-surface-primary text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {INTERVAL_LABELS[key]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Stat
          icon={<BookOpen className="w-3.5 h-3.5" aria-hidden />}
          label="Sessions"
          value={stats.sessions.toString()}
        />
        <Stat
          icon={<Layers className="w-3.5 h-3.5" aria-hidden />}
          label="Cards reviewed"
          value={stats.cardsReviewed.toString()}
        />
        <Stat
          icon={<Target className="w-3.5 h-3.5" aria-hidden />}
          label="Accuracy"
          value={stats.accuracyRate === null ? '' : `${stats.accuracyRate}%`}
          valueClass={stats.accuracyRate === null ? 'text-text-tertiary before:content-["—"]' : undefined}
        />
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden />
            Cards vs previous
          </div>
          <div className="text-lg font-semibold text-text-primary">
            <DeltaPct value={stats.cardsDeltaPct} cardsReviewed={stats.cardsReviewed} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
        {icon}
        {label}
      </div>
      <div className={`text-lg font-semibold ${valueClass ?? 'text-text-primary'}`}>{value}</div>
    </div>
  );
}