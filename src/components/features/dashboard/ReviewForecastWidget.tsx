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

export interface ReviewForecastData {
  today: number;
  tomorrow: number;
  in3Days: number;
  in7Days: number;
}

const BUCKET_LABELS = ['Today', 'Tomorrow', '3 days', '7 days'] as const;
const BAR_COLOR = 'var(--chart-bar)';

interface ReviewForecastWidgetProps {
  data: ReviewForecastData;
}

export function ReviewForecastWidget({ data }: ReviewForecastWidgetProps) {
  const chartData = [
    { label: BUCKET_LABELS[0], value: data.today, key: 'today' },
    { label: BUCKET_LABELS[1], value: data.tomorrow, key: 'tomorrow' },
    { label: BUCKET_LABELS[2], value: data.in3Days, key: 'in3Days' },
    { label: BUCKET_LABELS[3], value: data.in7Days, key: 'in7Days' },
  ];

  const totalScheduled = chartData.reduce((sum, d) => sum + d.value, 0);
  const maxValue = Math.max(...chartData.map((d) => d.value), 1);

  if (totalScheduled === 0) {
    return (
      <div className="rounded-xl border border-border-primary bg-surface-primary p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Review forecast
        </h3>
        <div className="flex min-h-[180px] items-center justify-center text-text-tertiary text-sm">
          No scheduled reviews — study some cards to see your forecast
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-primary bg-surface-primary p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        Review forecast
      </h3>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              domain={[0, maxValue]}
              hide
            />
            <YAxis
              type="category"
              dataKey="label"
              width={70}
              tick={{
                fill: 'var(--text-secondary)',
                fontSize: 12,
              }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{
                fill: 'var(--surface-tertiary)',
                fillOpacity: 0.4,
              }}
              content={(props) => {
                const { active, payload, label } = props;
                if (!active || !payload?.length) return null;
                const value = payload[0]?.value;
                if (value == null) return null;
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
                      {label}:{' '}
                    </span>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {value} cards
                    </span>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="value"
              fill={BAR_COLOR}
              radius={[0, 4, 4, 0]}
              maxBarSize={24}
              label={{
                position: 'right',
                fill: 'var(--text-secondary)',
                fontSize: 12,
              }}
            >
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={BAR_COLOR} fillOpacity={0.9} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
