import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { cards, decks, studySessions } from "@/db/schema";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Get start of today (midnight) in the given timezone, as a UTC epoch ms. */
function getStartOfTodayInTimezone(timeZone: string): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    fractionalSecondDigits: 3,
    hour12: false,
  }).formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const second = parseInt(parts.find((p) => p.type === "second")?.value ?? "0", 10);
  const ms = parseInt(
    parts.find((p) => p.type === "fractionalSecond")?.value ?? "0",
    10
  );
  const msSinceMidnight = (hour * 3600 + minute * 60 + second) * 1000 + ms;
  return now.getTime() - msSinceMidnight;
}

/** Get a YYYY-MM-DD day key for a timestamp in the given timezone. */
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

export interface MemoryStages {
  new: number;
  learning: number;
  reviewing: number;
  mastered: number;
}

/**
 * Per-day due-card counts for the next 30 days (today + 29 future days).
 * Cards overdue relative to today roll into today's bucket; cards beyond
 * the window are excluded.
 */
export interface ReviewForecastDay {
  date: string; // YYYY-MM-DD in the user's tz
  count: number;
}

export interface DashboardStats {
  memoryStages: MemoryStages;
  reviewForecast: ReviewForecastDay[];
  /** Number of cards due right now (nextReview <= current time). */
  dueNow: number;
  /** Earliest future nextReview timestamp (epoch ms), null when no cards exist. */
  nextDueAt: number | null;
}

/** Interval windows supported by IntervalStats. */
export type IntervalKey = "1w" | "1m" | "1y";

export interface IntervalStats {
  sessions: number;
  cardsReviewed: number;
  cardsCorrect: number;
  accuracyRate: number | null;
  /** Cards reviewed in the previous interval of the same length. */
  prevCardsReviewed: number;
  /** (curr - prev) / prev * 100, rounded to nearest integer. null when prev = 0. */
  cardsDeltaPct: number | null;
}

export type IntervalStatsResponse = Record<IntervalKey, IntervalStats>;

/**
 * Memory stages + 30-day review forecast across all of the user's decks.
 * Uses a single SQL aggregation instead of the Convex version's per-deck fanout.
 */
export async function dashboardStats(
  userId: string,
  timeZone: string
): Promise<DashboardStats> {
  const rows = await db
    .select({
      repetitions: cards.repetitions,
      nextReview: cards.nextReview,
    })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(eq(decks.userId, userId));

  const memoryStages: MemoryStages = {
    new: 0,
    learning: 0,
    reviewing: 0,
    mastered: 0,
  };

  const nowMs = Date.now();
  const todayStart = getStartOfTodayInTimezone(timeZone);
  const horizonEnd = todayStart + 30 * MS_PER_DAY;
  const forecastByDay = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const key = getDayKey(todayStart + i * MS_PER_DAY, timeZone);
    forecastByDay.set(key, 0);
  }

  let dueNow = 0;
  let nextDueAt: number | null = null;

  for (const card of rows) {
    const reps = card.repetitions;
    if (reps === 0) memoryStages.new++;
    else if (reps <= 2) memoryStages.learning++;
    else if (reps <= 5) memoryStages.reviewing++;
    else memoryStages.mastered++;

    const nr = card.nextReview.getTime();
    if (nr <= nowMs) {
      dueNow++;
    } else if (nextDueAt === null || nr < nextDueAt) {
      nextDueAt = nr;
    }

    const bucketStart = nr < todayStart ? todayStart : nr;
    if (bucketStart < horizonEnd) {
      const key = getDayKey(bucketStart, timeZone);
      const existing = forecastByDay.get(key);
      if (existing !== undefined) forecastByDay.set(key, existing + 1);
    }
  }

  const reviewForecast: ReviewForecastDay[] = [];
  for (let i = 0; i < 30; i++) {
    const key = getDayKey(todayStart + i * MS_PER_DAY, timeZone);
    reviewForecast.push({ date: key, count: forecastByDay.get(key) ?? 0 });
  }

  return { memoryStages, reviewForecast, dueNow, nextDueAt };
}

/** Same aggregations but scoped to a single deck. */
export async function deckStats(
  userId: string,
  deckId: number,
  timeZone: string
): Promise<DashboardStats | null> {
  const [deck] = await db
    .select({ id: decks.id })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .limit(1);
  if (!deck) return null;

  const rows = await db
    .select({
      repetitions: cards.repetitions,
      nextReview: cards.nextReview,
    })
    .from(cards)
    .where(eq(cards.deckId, deckId));

  const memoryStages: MemoryStages = {
    new: 0,
    learning: 0,
    reviewing: 0,
    mastered: 0,
  };

  const nowMs = Date.now();
  const todayStart = getStartOfTodayInTimezone(timeZone);
  const horizonEnd = todayStart + 30 * MS_PER_DAY;
  const forecastByDay = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const key = getDayKey(todayStart + i * MS_PER_DAY, timeZone);
    forecastByDay.set(key, 0);
  }

  let dueNow = 0;
  let nextDueAt: number | null = null;

  for (const card of rows) {
    const reps = card.repetitions;
    if (reps === 0) memoryStages.new++;
    else if (reps <= 2) memoryStages.learning++;
    else if (reps <= 5) memoryStages.reviewing++;
    else memoryStages.mastered++;

    const nr = card.nextReview.getTime();
    if (nr <= nowMs) {
      dueNow++;
    } else if (nextDueAt === null || nr < nextDueAt) {
      nextDueAt = nr;
    }

    const bucketStart = nr < todayStart ? todayStart : nr;
    if (bucketStart < horizonEnd) {
      const key = getDayKey(bucketStart, timeZone);
      const existing = forecastByDay.get(key);
      if (existing !== undefined) forecastByDay.set(key, existing + 1);
    }
  }

  const reviewForecast: ReviewForecastDay[] = [];
  for (let i = 0; i < 30; i++) {
    const key = getDayKey(todayStart + i * MS_PER_DAY, timeZone);
    reviewForecast.push({ date: key, count: forecastByDay.get(key) ?? 0 });
  }

  return { memoryStages, reviewForecast, dueNow, nextDueAt };
}

/**
 * Build an IntervalStats record from sessions in a window and the prior
 * window of equal length. `start` is the inclusive start (epoch ms) of the
 * current interval; `prevStart` is the inclusive start of the previous one.
 */
function buildIntervalStats(
  sessions: { startedAt: Date; cardsStudied: number; cardsCorrect: number }[],
  start: number,
  end: number,
  prevStart: number
): IntervalStats {
  let sessionsCount = 0;
  let cardsReviewed = 0;
  let cardsCorrect = 0;
  let prevCardsReviewed = 0;

  for (const s of sessions) {
    const t = s.startedAt.getTime();
    if (t >= start && t < end) {
      sessionsCount++;
      cardsReviewed += s.cardsStudied;
      cardsCorrect += s.cardsCorrect;
    } else if (t >= prevStart && t < start) {
      prevCardsReviewed += s.cardsStudied;
    }
  }

  const accuracyRate =
    cardsReviewed > 0 ? Math.round((cardsCorrect / cardsReviewed) * 100) : null;

  const cardsDeltaPct =
    prevCardsReviewed > 0
      ? Math.round(((cardsReviewed - prevCardsReviewed) / prevCardsReviewed) * 100)
      : null;

  return {
    sessions: sessionsCount,
    cardsReviewed,
    cardsCorrect,
    accuracyRate,
    prevCardsReviewed,
    cardsDeltaPct,
  };
}

/**
 * Sessions / cards reviewed / accuracy / % change for 1w, 1m, 1y windows.
 * Fetches sessions from the last 2 years (covers the 1y interval + prior
 * 1y baseline). Scoped to the user.
 */
export async function intervalStats(
  userId: string,
  timeZone: string
): Promise<IntervalStatsResponse> {
  const todayStart = getStartOfTodayInTimezone(timeZone);
  const twoYearsAgo = new Date(todayStart - 730 * MS_PER_DAY);

  const rows = await db
    .select({
      startedAt: studySessions.startedAt,
      cardsStudied: studySessions.cardsStudied,
      cardsCorrect: studySessions.cardsCorrect,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, userId),
        gte(studySessions.startedAt, twoYearsAgo),
        sql`${studySessions.completedAt} is not null`
      )
    );

  return {
    "1w": buildIntervalStats(rows, todayStart - 6 * MS_PER_DAY, todayStart + MS_PER_DAY, todayStart - 13 * MS_PER_DAY),
    "1m": buildIntervalStats(rows, todayStart - 29 * MS_PER_DAY, todayStart + MS_PER_DAY, todayStart - 59 * MS_PER_DAY),
    "1y": buildIntervalStats(rows, todayStart - 364 * MS_PER_DAY, todayStart + MS_PER_DAY, todayStart - 729 * MS_PER_DAY),
  };
}

/**
 * Same as intervalStats but scoped to a single deck owned by the user.
 * Returns null when the deck does not exist or is not owned.
 */
export async function deckIntervalStats(
  userId: string,
  deckId: number,
  timeZone: string
): Promise<IntervalStatsResponse | null> {
  const [deck] = await db
    .select({ id: decks.id })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .limit(1);
  if (!deck) return null;

  const todayStart = getStartOfTodayInTimezone(timeZone);
  const twoYearsAgo = new Date(todayStart - 730 * MS_PER_DAY);

  const rows = await db
    .select({
      startedAt: studySessions.startedAt,
      cardsStudied: studySessions.cardsStudied,
      cardsCorrect: studySessions.cardsCorrect,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.deckId, deckId),
        gte(studySessions.startedAt, twoYearsAgo),
        sql`${studySessions.completedAt} is not null`
      )
    );

  return {
    "1w": buildIntervalStats(rows, todayStart - 6 * MS_PER_DAY, todayStart + MS_PER_DAY, todayStart - 13 * MS_PER_DAY),
    "1m": buildIntervalStats(rows, todayStart - 29 * MS_PER_DAY, todayStart + MS_PER_DAY, todayStart - 59 * MS_PER_DAY),
    "1y": buildIntervalStats(rows, todayStart - 364 * MS_PER_DAY, todayStart + MS_PER_DAY, todayStart - 729 * MS_PER_DAY),
  };
}

/** 182 days of per-day card counts for the activity heatmap. */
export async function activityHistory(
  userId: string,
  timeZone: string
): Promise<Record<string, number> | null> {
  const lookbackDays = 182;
  const startDate = new Date(Date.now() - lookbackDays * MS_PER_DAY);

  const rows = await db
    .select({
      startedAt: studySessions.startedAt,
      cardsStudied: studySessions.cardsStudied,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, userId),
        gte(studySessions.startedAt, startDate),
        sql`${studySessions.completedAt} is not null`
      )
    );

  const byDay: Record<string, number> = {};
  for (const s of rows) {
    const key = getDayKey(s.startedAt.getTime(), timeZone);
    byDay[key] = (byDay[key] ?? 0) + s.cardsStudied;
  }

  return byDay;
}