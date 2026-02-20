'use client';

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

function getDayKey(timestamp: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function ActivityHeatmapWidget({ data, timeZone }: ActivityHeatmapWidgetProps) {
  const tz = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Build 90-day grid ending today (in the user's timezone)
  const todayKey = getDayKey(Date.now(), tz);
  const todayMs = new Date(todayKey + "T00:00:00").getTime();

  const days: { date: string; count: number; dayOfWeek: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const key = getDayKey(todayMs - i * 24 * 60 * 60 * 1000, tz);
    const d = new Date(key + "T00:00:00");
    days.push({
      date: key,
      count: data[key] ?? 0,
      dayOfWeek: d.getDay(),
    });
  }

  // Group into weeks (columns)
  const weeks: typeof days[] = [];
  let currentWeek: typeof days = [];
  for (const day of days) {
    if (day.dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  // Pad first week so it starts at the correct day of week
  if (weeks[0] && weeks[0].length < 7) {
    const pad = 7 - weeks[0].length;
    const emptyDays = Array.from({ length: pad }, () => ({
      date: '',
      count: 0,
      dayOfWeek: -1,
    }));
    // First week needs padding at the top (start of week)
    weeks[0] = [...emptyDays, ...weeks[0]];
  }

  // Month labels
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = '';
  for (let wi = 0; wi < weeks.length; wi++) {
    const firstReal = weeks[wi].find((d) => d.date !== '');
    if (firstReal) {
      const month = new Date(firstReal.date + "T00:00:00").toLocaleString('default', {
        month: 'short',
      });
      if (month !== lastMonth) {
        monthLabels.push({ label: month, weekIndex: wi });
        lastMonth = month;
      }
    }
  }

  const totalCards = Object.values(data).reduce((sum, c) => sum + c, 0);

  return (
    <div className="rounded-xl border border-border-primary bg-surface-primary p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Study activity
        </h3>
        <span className="text-xs text-text-tertiary">
          {totalCards} cards in last 90 days
        </span>
      </div>

      <div className="overflow-x-auto">
        {/* Month labels */}
        <div className="flex gap-[3px] mb-1 ml-0">
          {weeks.map((_, wi) => {
            const label = monthLabels.find((m) => m.weekIndex === wi);
            return (
              <div key={wi} className="w-[13px] shrink-0">
                {label && (
                  <span className="text-[10px] text-text-tertiary">
                    {label.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Grid */}
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <div
                  key={di}
                  className="w-[13px] h-[13px] rounded-[2px]"
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

      {/* Legend */}
      <div className="flex items-center gap-1 mt-3 justify-end">
        <span className="text-[10px] text-text-tertiary mr-1">Less</span>
        {[0, 1, 2, 3].map((level) => (
          <div
            key={level}
            className="w-[11px] h-[11px] rounded-[2px]"
            style={INTENSITY_STYLES[level]}
          />
        ))}
        <span className="text-[10px] text-text-tertiary ml-1">More</span>
      </div>
    </div>
  );
}
