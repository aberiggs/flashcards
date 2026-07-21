'use client';

import { useRef, KeyboardEvent } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';
import type { ForecastHorizon } from '@/lib/hooks';

export interface ReviewForecastBucket {
  date: string;
  count: number;
  bucket: 'hour' | 'day';
}

interface ReviewForecastWidgetProps {
  data: ReviewForecastBucket[];
  timeZone?: string;
  /** Currently selected horizon. The widget is controlled — the parent owns
   *  the state so the dashboard and deck pages can persist it independently. */
  horizon: ForecastHorizon;
  onHorizonChange: (h: ForecastHorizon) => void;
}

const BAR_COLOR = 'var(--chart-bar)';
const TODAY_COLOR = 'var(--accent-primary)';

const HORIZON_OPTIONS: ForecastHorizon[] = ['24h', '30d'];
const HORIZON_LABELS: Record<ForecastHorizon, string> = {
  '24h': '24h',
  '30d': '30d',
};

/**
 * Format a bucket date for the X-axis.
 * - Day buckets  → "M/D"  (e.g. 7/21)
 * - Hour buckets → "HH:00" using the user's timezone (e.g. 14:00)
 */
function formatTickLabel(iso: string, bucket: 'hour' | 'day', timeZone: string): string {
  if (bucket === 'hour') {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hour: '2-digit',
      hour12: false,
    }).format(d);
  }
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatTooltipTitle(iso: string, bucket: 'hour' | 'day', timeZone: string): string {
  const d = new Date(bucket === 'hour' ? iso : `${iso}T00:00:00`);
  if (bucket === 'hour') {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

/**
 * Identify the "current" bucket — the one to highlight in the accent color
 * and to count as "due now" in the header summary. For 30d it's today; for
 * 24h it's the current hour.
 */
function currentBucketKey(horizon: ForecastHorizon, timeZone: string): string {
  if (horizon === '24h') {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const year = parts.find((p) => p.type === 'year')?.value ?? '0000';
    const month = parts.find((p) => p.type === 'month')?.value ?? '01';
    const day = parts.find((p) => p.type === 'day')?.value ?? '01';
    let hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
    if (hour === '24') hour = '00';
    return `${year}-${month}-${day}T${hour}:00`;
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function ReviewForecastWidget({
  data,
  timeZone,
  horizon,
  onHorizonChange,
}: ReviewForecastWidgetProps) {
  const tz = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayKey = currentBucketKey(horizon, tz);
  const tabRefs = useRef<Record<ForecastHorizon, HTMLButtonElement | null>>({
    '24h': null,
    '30d': null,
  });

  const chartData = data.map((d) => ({
    label: formatTickLabel(d.date, d.bucket, tz),
    value: d.count,
    date: d.date,
    bucket: d.bucket,
    isCurrent: d.date === todayKey,
  }));

  const totalScheduled = chartData.reduce((sum, d) => sum + d.value, 0);
  const currentBucket = chartData.find((d) => d.isCurrent);
  const dueNow = currentBucket?.value ?? 0;

  // Pick a tick interval that yields ≤ 8 visible ticks across the X-axis so
  // multi-char labels never collide. For 24 buckets, every 3rd tick fits;
  // for 30 buckets, every 4th tick (≈ 8 labels) does. The bug fixed here
  // was `interval={4}` showing only the right-most digit of each label.
  const tickInterval = horizon === '24h' ? 2 : Math.ceil(chartData.length / 8) - 1;

  const horizonNoun = horizon === '24h' ? '24 hours' : '30 days';

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = HORIZON_OPTIONS.indexOf(horizon);
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIdx = (idx + 1) % HORIZON_OPTIONS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIdx = (idx - 1 + HORIZON_OPTIONS.length) % HORIZON_OPTIONS.length;
    }
    if (nextIdx === null) return;
    e.preventDefault();
    const nextKey = HORIZON_OPTIONS[nextIdx];
    onHorizonChange(nextKey);
    tabRefs.current[nextKey]?.focus();
  };

  const empty = totalScheduled === 0;

  return (
    <div className="rounded-xl border border-border-primary bg-surface-primary p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Review forecast</h3>
        <div
          role="tablist"
          aria-label="Review forecast horizon"
          className="inline-flex rounded-lg border border-border-primary bg-surface-secondary p-0.5 text-xs"
          onKeyDown={handleKeyDown}
        >
          {HORIZON_OPTIONS.map((key) => {
            const selected = key === horizon;
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
                onClick={() => onHorizonChange(key)}
                className={`px-3 py-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary ${
                  selected
                    ? 'bg-surface-primary text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {HORIZON_LABELS[key]}
              </button>
            );
          })}
        </div>
      </div>

      {empty ? (
        <div className="flex min-h-44 items-center justify-center text-text-tertiary text-sm">
          No scheduled reviews in the next {horizonNoun}
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-baseline gap-2 text-xs text-text-tertiary tabular-nums">
            <span className="font-medium text-text-primary">{dueNow}</span>
            <span>due now ·</span>
            <span className="font-medium text-text-secondary">{totalScheduled}</span>
            <span>scheduled in the next {horizonNoun}</span>
          </div>
          <div className="h-40 sm:h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="label"
                  interval={tickInterval}
                  tickMargin={8}
                  tick={{
                    fill: 'var(--text-tertiary)',
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{
                    fill: 'var(--text-tertiary)',
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  cursor={{
                    fill: 'var(--surface-tertiary)',
                    fillOpacity: 0.4,
                  }}
                  content={(props) => {
                    const { active, payload } = props;
                    if (!active || !payload?.length) return null;
                    const entry = payload[0]?.payload as
                      | { date: string; value: number; bucket: 'hour' | 'day' }
                      | undefined;
                    if (!entry) return null;
                    return (
                      <div
                        className="rounded-lg border px-3 py-2 shadow-md"
                        style={{
                          backgroundColor: 'var(--surface-primary)',
                          borderColor: 'var(--border-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {formatTooltipTitle(entry.date, entry.bucket, tz)}:{' '}
                        </span>
                        <span style={{ color: 'var(--text-primary)' }}>
                          {entry.value} card{entry.value !== 1 ? 's' : ''}
                        </span>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="value"
                  fill={BAR_COLOR}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={24}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.date}
                      fill={entry.isCurrent ? TODAY_COLOR : BAR_COLOR}
                      fillOpacity={entry.isCurrent ? 1 : 0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}