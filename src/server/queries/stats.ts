import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { cards, decks, studySessions } from "@/db/schema";
import { getCardTier, CARD_TIERS, type CardTier } from "@/lib/memoryStage";

/**
 * Map each {@link CardTier} to its lowercase key in {@link MemoryStages}.
 * Built from CARD_TIERS so the order stays in sync with the tier list.
 */
const TIER_KEY: Record<CardTier, keyof MemoryStages> = Object.fromEntries(
  CARD_TIERS.map((tier) => [tier, tier.toLowerCase()])
) as Record<CardTier, keyof MemoryStages>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

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

/**
 * Get a `YYYY-MM-DDTHH:00` hour key for a timestamp in the given timezone.
 * Used by the 24h forecast horizon. Hours are zero-padded, 24-hour clock.
 */
function getHourKey(timestamp: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date(timestamp));
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  // Intl uses "24" instead of "00" for midnight with hour12:false in some
  // environments; normalize so we always get "00".
  let hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  if (hour === "24") hour = "00";
  return `${year}-${month}-${day}T${hour}:00`;
}

/**
 * Per-tier card counts for the memory-stages chart. One bucket per
 * {@link CardTier} (Seed / Sprout / Seedling / Sapling / Bud / Bloom /
 * Fruit). The older 4-bucket roll-up is gone — the dashboard now shows the
 * full 7-tier progression. The 4-bucket {@link getMemoryStage} roll-up is
 * still used by the stage filter in the deck page.
 */
export interface MemoryStages {
  seed: number;
  sprout: number;
  seedling: number;
  sapling: number;
  bud: number;
  bloom: number;
  fruit: number;
}

/**
 * Forecast horizon. `'30d'` (default) buckets by day for 30 days; `'24h'`
 * buckets by hour for the next 24 hours. The two share a single response
 * shape — see {@link ReviewForecastBucket} — so the widget can render either
 * mode with the same code path.
 */
export type ForecastHorizon = "24h" | "30d";

export const FORECAST_HORIZONS: ForecastHorizon[] = ["24h", "30d"];

export function normalizeHorizon(value: string | null | undefined): ForecastHorizon {
  return value === "24h" ? "24h" : "30d";
}

/**
 * One bucket in the review forecast. `bucket` tells the client how to format
 * the X-axis label and how to interpret `date`:
 * - `'day'`  → `date` is `YYYY-MM-DD` (day key in the user's tz).
 * - `'hour'` → `date` is `YYYY-MM-DDTHH:00` (hour key in the user's tz).
 */
export interface ReviewForecastBucket {
  date: string;
  count: number;
  bucket: "hour" | "day";
}

/** @deprecated Use {@link ReviewForecastBucket}. Kept as an alias for callers. */
export type ReviewForecastDay = ReviewForecastBucket;

export interface DashboardStats {
  memoryStages: MemoryStages;
  reviewForecast: ReviewForecastBucket[];
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
 * Build the review forecast buckets for a horizon, given the per-card
 * `nextReview` timestamps. Pure: takes already-fetched rows + a timeZone +
 * horizon and returns the ordered bucket list. Shared by
 * {@link dashboardStats} and {@link deckStats} so the bucketing logic
 * can't drift between them.
 *
 * Horizon semantics:
 * - `'30d'` → 30 day-buckets starting today. Cards overdue relative to
 *   today roll into today's bucket; cards beyond 30 days are excluded.
 * - `'24h'` → 24 hour-buckets starting at the current hour. Cards due
 *   earlier than the current hour roll into the first (current-hour)
 *   bucket; cards beyond 24h are excluded.
 */
function buildForecast(
  rows: { nextReview: Date }[],
  timeZone: string,
  horizon: ForecastHorizon
): ReviewForecastBucket[] {
  const nowMs = Date.now();
  const todayStart = getStartOfTodayInTimezone(timeZone);

  if (horizon === "24h") {
    // Anchor at the start of the current hour in the user's tz. We compute
    // this from `now` rather than `todayStart` so the first bucket is the
    // hour we're currently in, not midnight.
    const hourStart =
      todayStart +
      Math.floor((nowMs - todayStart) / MS_PER_HOUR) * MS_PER_HOUR;
    const horizonEnd = hourStart + 24 * MS_PER_HOUR;
    const forecastByHour = new Map<string, number>();
    for (let i = 0; i < 24; i++) {
      const key = getHourKey(hourStart + i * MS_PER_HOUR, timeZone);
      forecastByHour.set(key, 0);
    }

    for (const card of rows) {
      const nr = card.nextReview.getTime();
      const bucketStart = nr < hourStart ? hourStart : nr;
      if (bucketStart < horizonEnd) {
        const key = getHourKey(bucketStart, timeZone);
        const existing = forecastByHour.get(key);
        if (existing !== undefined) forecastByHour.set(key, existing + 1);
      }
    }

    const out: ReviewForecastBucket[] = [];
    for (let i = 0; i < 24; i++) {
      const key = getHourKey(hourStart + i * MS_PER_HOUR, timeZone);
      out.push({ date: key, count: forecastByHour.get(key) ?? 0, bucket: "hour" });
    }
    return out;
  }

  // 30d (default)
  const horizonEnd = todayStart + 30 * MS_PER_DAY;
  const forecastByDay = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const key = getDayKey(todayStart + i * MS_PER_DAY, timeZone);
    forecastByDay.set(key, 0);
  }

  for (const card of rows) {
    const nr = card.nextReview.getTime();
    const bucketStart = nr < todayStart ? todayStart : nr;
    if (bucketStart < horizonEnd) {
      const key = getDayKey(bucketStart, timeZone);
      const existing = forecastByDay.get(key);
      if (existing !== undefined) forecastByDay.set(key, existing + 1);
    }
  }

  const out: ReviewForecastBucket[] = [];
  for (let i = 0; i < 30; i++) {
    const key = getDayKey(todayStart + i * MS_PER_DAY, timeZone);
    out.push({ date: key, count: forecastByDay.get(key) ?? 0, bucket: "day" });
  }
  return out;
}

/**
 * Accumulate memory stages + due-now/next-due counters from a set of card
 * rows. Pure helper shared by {@link dashboardStats} and {@link deckStats}.
 */
function buildCardAggregates(
  rows: { repetitions: number; nextReview: Date }[],
  nowMs: number
): {
  memoryStages: MemoryStages;
  dueNow: number;
  nextDueAt: number | null;
} {
  const memoryStages: MemoryStages = {
    seed: 0,
    sprout: 0,
    seedling: 0,
    sapling: 0,
    bud: 0,
    bloom: 0,
    fruit: 0,
  };
  let dueNow = 0;
  let nextDueAt: number | null = null;

  for (const card of rows) {
    const tier = getCardTier(card.repetitions);
    memoryStages[TIER_KEY[tier]]++;

    const nr = card.nextReview.getTime();
    if (nr <= nowMs) {
      dueNow++;
    } else if (nextDueAt === null || nr < nextDueAt) {
      nextDueAt = nr;
    }
  }

  return { memoryStages, dueNow, nextDueAt };
}

/**
 * Memory stages + review forecast across all of the user's decks. Horizon
 * selects 30 day-buckets (default) or 24 hour-buckets. Uses a single SQL
 * aggregation instead of the Convex version's per-deck fanout.
 */
export async function dashboardStats(
  userId: string,
  timeZone: string,
  horizon: ForecastHorizon = "30d"
): Promise<DashboardStats> {
  const rows = await db
    .select({
      repetitions: cards.repetitions,
      nextReview: cards.nextReview,
    })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(eq(decks.userId, userId));

  const { memoryStages, dueNow, nextDueAt } = buildCardAggregates(rows, Date.now());
  const reviewForecast = buildForecast(rows, timeZone, horizon);
  return { memoryStages, reviewForecast, dueNow, nextDueAt };
}

/** Same aggregations but scoped to a single deck. */
export async function deckStats(
  userId: string,
  deckId: number,
  timeZone: string,
  horizon: ForecastHorizon = "30d"
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

  const { memoryStages, dueNow, nextDueAt } = buildCardAggregates(rows, Date.now());
  const reviewForecast = buildForecast(rows, timeZone, horizon);
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