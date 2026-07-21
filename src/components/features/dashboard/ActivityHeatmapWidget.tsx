'use client';

import { useEffect, useRef } from 'react';

import {
  buildHeatmapDays,
  groupIntoWeeks,
  computeMonthLabels,
} from '@/lib/heatmap';

interface ActivityHeatmapWidgetProps {
  data: Record<string, number>;
  timeZone?: string;
}

function getIntensityLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 10) return 2;
  return 3;
}

const INTENSITY_STYLES: Record<number, React.CSSProperties> = {
  0: { backgroundColor: 'var(--surface-tertiary)' },
  1: { backgroundColor: 'color-mix(in srgb, var(--chart-activity) 25%, var(--surface-tertiary))' },
  2: { backgroundColor: 'color-mix(in srgb, var(--chart-activity) 55%, var(--surface-tertiary))' },
  3: { backgroundColor: 'var(--chart-activity)' },
};

export function ActivityHeatmapWidget({ data, timeZone }: ActivityHeatmapWidgetProps) {
  const tz = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const days = buildHeatmapDays(data, tz);
  const weeks = groupIntoWeeks(days);
  const monthLabels = computeMonthLabels(weeks);
  const totalCards = Object.values(data).reduce((sum, c) => sum + c, 0);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [weeks.length]);

  return (
    <div className="rounded-xl border border-border-primary bg-surface-primary p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Activity
        </h3>
        <span className="text-xs text-text-tertiary">
          {totalCards} cards in last 6 months
        </span>
      </div>

      <div ref={scrollRef} className="overflow-x-auto">
        <div className="inline-flex flex-col min-w-fit">
          {/* Month labels — offset by weekday label width */}
          <div className="flex mb-1">
            <div className="w-7 shrink-0" />
            <div className="flex gap-0.5">
              {weeks.map((_, wi) => {
                const label = monthLabels.find((m) => m.weekIndex === wi);
                return (
                  <div key={wi} className="w-3.5 shrink-0">
                    {label && (
                      <span className="text-[10px] text-text-tertiary leading-none">
                        {label.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Body: weekday labels + grid */}
          <div className="flex gap-0.5">
            {/* Weekday labels (Mon, Wed, Fri) */}
            <div className="flex flex-col gap-0.5 w-7 shrink-0">
              {[null, 'Mon', null, 'Wed', null, 'Fri', null].map((label, i) => (
                <div key={i} className="h-3.5 flex items-center">
                  {label && (
                    <span className="text-[10px] text-text-tertiary leading-none">
                      {label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex gap-0.5">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-0.5">
                  {week.days.map((day, di) => (
                    <div
                      key={di}
                      className="size-3.5 rounded-sm"
                      style={
                        day.date === ''
                          ? { backgroundColor: 'transparent' }
                          : INTENSITY_STYLES[getIntensityLevel(day.count)]
                      }
                      title={
                        day.date
                          ? `${day.date}: ${day.count} card${day.count !== 1 ? 's' : ''}`
                          : ''
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-3 justify-end">
        <span className="text-xs text-text-tertiary mr-1">Less</span>
        {[0, 1, 2, 3].map((level) => (
          <div
            key={level}
            className="size-3 rounded-sm"
            style={INTENSITY_STYLES[level]}
          />
        ))}
        <span className="text-xs text-text-tertiary ml-1">More</span>
      </div>
    </div>
  );
}