'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';

interface HeroCTAWidgetProps {
  dueNow: number;
  nextDueAt: number | null;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function HeroCTAWidget({ dueNow, nextDueAt }: HeroCTAWidgetProps) {
  const [nowMs, setNowMs] = useState(Date.now);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now), 60_000);
    return () => clearInterval(id);
  }, []);

  const nextDueLabel = useMemo(() => {
    if (dueNow > 0 || nextDueAt === null) return null;
    const remaining = nextDueAt - nowMs;
    if (remaining <= 0) return null;
    return `Next card due in ${formatDuration(remaining)}`;
  }, [dueNow, nextDueAt, nowMs]);

  const hasCards = dueNow > 0 || nextDueAt !== null;
  const greeting = getGreeting();

  return (
    <div className="flex flex-row items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-text-primary">
          {greeting}
        </h1>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-text-primary tabular-nums">
            {dueNow}
          </span>
          <span className="text-base text-text-secondary">
            {dueNow === 1 ? 'card due now' : 'cards due now'}
          </span>
        </div>
        {nextDueLabel && (
          <div className="flex items-center gap-1.5 mt-2 text-sm text-text-tertiary">
            <Clock className="w-4 h-4 shrink-0" aria-hidden />
            {nextDueLabel}
          </div>
        )}
        {!hasCards && (
          <p className="mt-2 text-sm text-text-tertiary">
            You&apos;re all caught up — great work.
          </p>
        )}
      </div>

      <div className="shrink-0">
        {dueNow > 0 ? (
          <Link
            href="/decks"
            className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-semibold text-text-inverse transition-colors hover:bg-accent-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Study now
            <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        ) : (
          <Link
            href="/decks"
            className="inline-flex items-center gap-2 rounded-lg border border-border-primary bg-surface-primary px-5 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-secondary hover:border-border-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Browse decks
            <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}