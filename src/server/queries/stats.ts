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

export interface ReviewForecast {
  today: number;
  tomorrow: number;
  in3Days: number;
  in7Days: number;
}

export interface DashboardStats {
  memoryStages: MemoryStages;
  reviewForecast: ReviewForecast;
}

export interface GamificationStats {
  streak: number;
  todayCards: number;
  weekCards: number;
  accuracyRate: number | null;
}

/**
 * Memory stages + review forecast across all of the user's decks.
 * Uses a single SQL aggregation instead of the Convex version's per-deck fanout.
 */
export async function dashboardStats(
  userId: string,
  timeZone: string
): Promise<DashboardStats> {
  const todayStart = getStartOfTodayInTimezone(timeZone);
  const todayEnd = new Date(todayStart + MS_PER_DAY);
  const tomorrowEnd = new Date(todayStart + 2 * MS_PER_DAY);
  const threeDaysEnd = new Date(todayStart + 4 * MS_PER_DAY);
  const sevenDaysEnd = new Date(todayStart + 8 * MS_PER_DAY);

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
  const reviewForecast: ReviewForecast = {
    today: 0,
    tomorrow: 0,
    in3Days: 0,
    in7Days: 0,
  };

  for (const card of rows) {
    const reps = card.repetitions;
    if (reps === 0) memoryStages.new++;
    else if (reps <= 2) memoryStages.learning++;
    else if (reps <= 5) memoryStages.reviewing++;
    else memoryStages.mastered++;

    const nr = card.nextReview.getTime();
    if (nr <= todayEnd.getTime()) reviewForecast.today++;
    else if (nr <= tomorrowEnd.getTime()) reviewForecast.tomorrow++;
    else if (nr <= threeDaysEnd.getTime()) reviewForecast.in3Days++;
    else if (nr <= sevenDaysEnd.getTime()) reviewForecast.in7Days++;
  }

  return { memoryStages, reviewForecast };
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

  const todayStart = getStartOfTodayInTimezone(timeZone);
  const todayEnd = new Date(todayStart + MS_PER_DAY);
  const tomorrowEnd = new Date(todayStart + 2 * MS_PER_DAY);
  const threeDaysEnd = new Date(todayStart + 4 * MS_PER_DAY);
  const sevenDaysEnd = new Date(todayStart + 8 * MS_PER_DAY);

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
  const reviewForecast: ReviewForecast = {
    today: 0,
    tomorrow: 0,
    in3Days: 0,
    in7Days: 0,
  };

  for (const card of rows) {
    const reps = card.repetitions;
    if (reps === 0) memoryStages.new++;
    else if (reps <= 2) memoryStages.learning++;
    else if (reps <= 5) memoryStages.reviewing++;
    else memoryStages.mastered++;

    const nr = card.nextReview.getTime();
    if (nr <= todayEnd.getTime()) reviewForecast.today++;
    else if (nr <= tomorrowEnd.getTime()) reviewForecast.tomorrow++;
    else if (nr <= threeDaysEnd.getTime()) reviewForecast.in3Days++;
    else if (nr <= sevenDaysEnd.getTime()) reviewForecast.in7Days++;
  }

  return { memoryStages, reviewForecast };
}

/** Streak, today's cards, week's cards, accuracy — over completed sessions. */
export async function gamificationStats(
  userId: string,
  timeZone: string
): Promise<GamificationStats | null> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * MS_PER_DAY);

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
        gte(studySessions.startedAt, ninetyDaysAgo),
        sql`${studySessions.completedAt} is not null`
      )
    );

  if (rows.length === 0) {
    return { streak: 0, todayCards: 0, weekCards: 0, accuracyRate: null };
  }

  const todayStart = getStartOfTodayInTimezone(timeZone);
  const weekStart = todayStart - 6 * MS_PER_DAY;

  const dayKeys = new Set<string>();
  for (const s of rows) {
    dayKeys.add(getDayKey(s.startedAt.getTime(), timeZone));
  }

  let streak = 0;
  let checkTime = todayStart;
  while (dayKeys.has(getDayKey(checkTime, timeZone))) {
    streak++;
    checkTime -= MS_PER_DAY;
  }

  let todayCards = 0;
  let weekCards = 0;
  let totalCorrect = 0;
  let totalStudied = 0;

  for (const s of rows) {
    const started = s.startedAt.getTime();
    if (started >= todayStart) todayCards += s.cardsStudied;
    if (started >= weekStart) weekCards += s.cardsStudied;
    totalCorrect += s.cardsCorrect;
    totalStudied += s.cardsStudied;
  }

  const accuracyRate =
    totalStudied > 0 ? Math.round((totalCorrect / totalStudied) * 100) : null;

  return { streak, todayCards, weekCards, accuracyRate };
}

/** 90 days of per-day card counts for the activity heatmap. */
export async function activityHistory(
  userId: string,
  timeZone: string
): Promise<Record<string, number> | null> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * MS_PER_DAY);

  const rows = await db
    .select({
      startedAt: studySessions.startedAt,
      cardsStudied: studySessions.cardsStudied,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, userId),
        gte(studySessions.startedAt, ninetyDaysAgo),
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