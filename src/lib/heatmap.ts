export interface HeatmapDay {
  date: string;
  count: number;
  dayOfWeek: number;
}

export interface HeatmapWeek {
  days: HeatmapDay[];
}

export interface HeatmapMonthLabel {
  label: string;
  weekIndex: number;
}

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

const LOOKBACK_DAYS = 182;

/**
 * Build the list of days for the heatmap grid, ending today.
 *
 * Iterates by calendar days (setDate), NOT by subtracting fixed
 * milliseconds. DST transitions make 24h arithmetic skip or
 * duplicate a day — e.g. March 8 spring-forward has 23 hours, so
 * subtracting 24h from March 9 midnight lands on March 7 11pm,
 * skipping March 8 entirely.
 */
export function buildHeatmapDays(
  data: Record<string, number>,
  timeZone: string,
  now: number = Date.now()
): HeatmapDay[] {
  const todayKey = getDayKey(now, timeZone);
  const todayDate = new Date(todayKey + "T00:00:00");

  const days: HeatmapDay[] = [];
  for (let i = LOOKBACK_DAYS - 1; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    const key = getDayKey(d.getTime(), timeZone);
    days.push({
      date: key,
      count: data[key] ?? 0,
      dayOfWeek: d.getDay(),
    });
  }

  return days;
}

/**
 * Group days into weeks (columns), splitting on Sunday (dayOfWeek === 0).
 * The first week is padded with empty days so it starts at the correct
 * day of week.
 */
export function groupIntoWeeks(days: HeatmapDay[]): HeatmapWeek[] {
  const weeks: HeatmapDay[][] = [];
  let currentWeek: HeatmapDay[] = [];

  for (const day of days) {
    if (day.dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  if (weeks[0] && weeks[0].length < 7) {
    const pad = 7 - weeks[0].length;
    const emptyDays: HeatmapDay[] = Array.from({ length: pad }, () => ({
      date: "",
      count: 0,
      dayOfWeek: -1,
    }));
    weeks[0] = [...emptyDays, ...weeks[0]];
  }

  return weeks.map((days) => ({ days }));
}

/**
 * Compute month labels for the heatmap, one per month transition.
 */
export function computeMonthLabels(weeks: HeatmapWeek[]): HeatmapMonthLabel[] {
  const labels: HeatmapMonthLabel[] = [];
  let lastMonth = "";

  for (let wi = 0; wi < weeks.length; wi++) {
    const firstReal = weeks[wi].days.find((d) => d.date !== "");
    if (!firstReal) continue;

    const month = new Date(firstReal.date + "T00:00:00").toLocaleString(
      "default",
      { month: "short" }
    );

    if (month !== lastMonth) {
      labels.push({ label: month, weekIndex: wi });
      lastMonth = month;
    }
  }

  return labels;
}