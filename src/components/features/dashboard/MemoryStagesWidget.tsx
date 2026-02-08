'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

export interface MemoryStagesData {
  new: number;
  learning: number;
  reviewing: number;
  mastered: number;
}

const STAGE_COLORS: Record<keyof MemoryStagesData, string> = {
  new: 'var(--chart-new)',
  learning: 'var(--chart-learning)',
  reviewing: 'var(--chart-reviewing)',
  mastered: 'var(--chart-mastered)',
};

const STAGE_LABELS: Record<keyof MemoryStagesData, string> = {
  new: 'New',
  learning: 'Learning',
  reviewing: 'Reviewing',
  mastered: 'Mastered',
};

interface MemoryStagesWidgetProps {
  data: MemoryStagesData;
}

export function MemoryStagesWidget({ data }: MemoryStagesWidgetProps) {
  const chartData = (['new', 'learning', 'reviewing', 'mastered'] as const)
    .filter((key) => data[key] > 0)
    .map((key) => ({
      name: STAGE_LABELS[key],
      value: data[key],
      fill: STAGE_COLORS[key],
    }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div className="rounded-xl border border-border-primary bg-surface-primary p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Memory stages
        </h3>
        <div className="flex min-h-[180px] items-center justify-center text-text-tertiary text-sm">
          No cards yet — create a deck to get started
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-primary bg-surface-primary p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        Memory stages
      </h3>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              content={(props) => {
                const { active, payload } = props;
                if (!active || !payload?.length) return null;
                const item = payload[0];
                const value = item.value;
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
                      {item.name}:{' '}
                    </span>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {value} ({Math.round((value / total) * 100)}%)
                    </span>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span
                  className="text-text-secondary"
                  style={{ fontSize: 12, color: 'var(--text-secondary)' }}
                >
                  {value}
                </span>
              )}
              wrapperStyle={{ color: 'var(--text-secondary)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
