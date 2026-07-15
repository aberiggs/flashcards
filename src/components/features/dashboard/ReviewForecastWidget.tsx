'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';

export interface ReviewForecastDay {
  date: string;
  count: number;
}

interface ReviewForecastWidgetProps {
  data: ReviewForecastDay[];
  timeZone?: string;
}

const BAR_COLOR = 'var(--chart-bar)';
const TODAY_COLOR = 'var(--accent-primary)';

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function ReviewForecastWidget({ data, timeZone }: ReviewForecastWidgetProps) {
  const tz = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const chartData = data.map((d) => ({
    label: formatShortDate(d.date),
    value: d.count,
    date: d.date,
    isToday: d.date === todayKey,
  }));

  const totalScheduled = chartData.reduce((sum, d) => sum + d.value, 0);

  if (totalScheduled === 0) {
    return (
      <div className="rounded-xl border border-border-primary bg-surface-primary p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Review forecast · next 30 days
        </h3>
        <div className="flex min-h-44 items-center justify-center text-text-tertiary text-sm">
          No scheduled reviews — study some cards to see your forecast
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-primary bg-surface-primary p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">
          Review forecast · next 30 days
        </h3>
        <span className="text-xs text-text-tertiary">
          {totalScheduled} card{totalScheduled !== 1 ? 's' : ''} due
        </span>
      </div>
      <div className="h-40 sm:h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
          >
            <XAxis
              dataKey="label"
              interval={4}
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
                  | { date: string; value: number }
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
                      {entry.date}:{' '}
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
                  fill={entry.isToday ? TODAY_COLOR : BAR_COLOR}
                  fillOpacity={entry.isToday ? 1 : 0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
