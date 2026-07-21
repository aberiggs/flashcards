'use client';

import { TIER_META } from '@/lib/memoryStage';
import type { MemoryStages } from '@/lib/hooks';

const STAGE_META: {
  key: keyof MemoryStages;
  label: string;
  color: string;
}[] = TIER_META.map((t) => ({
  key: t.tier.toLowerCase() as keyof MemoryStages,
  label: t.label,
  color: t.token,
}));

interface MemoryStagesWidgetProps {
  data: MemoryStages;
}

export function MemoryStagesWidget({ data }: MemoryStagesWidgetProps) {
  const total = STAGE_META.reduce((sum, s) => sum + data[s.key], 0);

  if (total === 0) {
    return (
      <div className="rounded-xl border border-border-primary bg-surface-primary p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Memory stages
        </h3>
        <div className="flex min-h-44 items-center justify-center text-text-tertiary text-sm">
          No cards yet — create a deck to get started
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-primary bg-surface-primary p-5 shadow-sm">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">
          Memory stages
        </h3>
        <span className="text-xs text-text-tertiary tabular-nums">
          {total} card{total !== 1 ? 's' : ''}
        </span>
      </div>

      <div
        className="flex h-3 w-full overflow-hidden rounded-full border border-border-primary"
        role="img"
        aria-label={`Memory stages: ${STAGE_META.map((s) => `${s.label} ${data[s.key]}`).join(', ')}`}
      >
        {STAGE_META.map((stage) => {
          const value = data[stage.key];
          if (value === 0) return null;
          const pct = (value / total) * 100;
          return (
            <div
              key={stage.key}
              className="h-full"
              style={{
                backgroundColor: stage.color,
                width: `${pct}%`,
              }}
              title={`${stage.label}: ${value} (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
        {STAGE_META.map((stage) => {
          const value = data[stage.key];
          const pct =
            value === 0 ? 0 : Math.round((value / total) * 100);
          return (
            <li
              key={stage.key}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="flex items-center gap-1.5 text-text-secondary min-w-0">
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: stage.color }}
                  aria-hidden
                />
                <span className="truncate">{stage.label}</span>
              </span>
              <span className="text-text-tertiary tabular-nums shrink-0">
                {value} · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}