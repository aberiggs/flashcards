import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { v } from "convex/values";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getMemoryStage(repetitions: number): "new" | "learning" | "reviewing" | "mastered" {
  if (repetitions === 0) return "new";
  if (repetitions <= 2) return "learning";
  if (repetitions <= 5) return "reviewing";
  return "mastered";
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

/** Get start of today (midnight) in the given timezone as a UTC timestamp. */
function getStartOfTodayInTimezone(timeZone: string): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const second = parseInt(parts.find((p) => p.type === "second")?.value ?? "0", 10);
  const msSinceMidnight = (hour * 3600 + minute * 60 + second) * 1000;
  return now.getTime() - msSinceMidnight;
}

/**
 * Returns dashboard stats: memory stages and review forecast.
 * timeZone should be an IANA string (e.g. "America/Los_Angeles") from
 * Intl.DateTimeFormat().resolvedOptions().timeZone.
 */
export const dashboardStats = query({
  args: {
    timeZone: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const decks = await ctx.db
      .query("decks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const deckIds = decks.map((d) => d._id);
    const todayStart = getStartOfTodayInTimezone(args.timeZone);
    const todayEnd = todayStart + MS_PER_DAY;
    const tomorrowEnd = todayStart + 2 * MS_PER_DAY;
    const threeDaysEnd = todayStart + 4 * MS_PER_DAY;
    const sevenDaysEnd = todayStart + 8 * MS_PER_DAY;

    let newCount = 0;
    let learningCount = 0;
    let reviewingCount = 0;
    let masteredCount = 0;

    let todayCount = 0;
    let tomorrowCount = 0;
    let in3DaysCount = 0;
    let in7DaysCount = 0;

    for (const deckId of deckIds) {
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_deck", (q) => q.eq("deckId", deckId))
        .collect();

      for (const card of cards) {
        const reps = card.repetitions ?? 0;
        const stage = getMemoryStage(reps);
        if (stage === "new") newCount++;
        else if (stage === "learning") learningCount++;
        else if (stage === "reviewing") reviewingCount++;
        else masteredCount++;

        const nextReview = card.nextReview;
        if (typeof nextReview !== "number") {
          todayCount++; // Never studied = ready today
          continue;
        }

        if (nextReview <= todayEnd) {
          todayCount++;
        } else if (nextReview <= tomorrowEnd) {
          tomorrowCount++;
        } else if (nextReview <= threeDaysEnd) {
          in3DaysCount++;
        } else if (nextReview <= sevenDaysEnd) {
          in7DaysCount++;
        }
      }
    }

    return {
      memoryStages: {
        new: newCount,
        learning: learningCount,
        reviewing: reviewingCount,
        mastered: masteredCount,
      },
      reviewForecast: {
        today: todayCount,
        tomorrow: tomorrowCount,
        in3Days: in3DaysCount,
        in7Days: in7DaysCount,
      },
    };
  },
});

/**
 * Returns stats for a single deck: memory stages and review forecast.
 * Verifies user ownership of the deck. timeZone should be an IANA string.
 */
export const deckStats = query({
  args: {
    deckId: v.id("decks"),
    timeZone: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId) return null;

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .collect();

    const todayStart = getStartOfTodayInTimezone(args.timeZone);
    const todayEnd = todayStart + MS_PER_DAY;
    const tomorrowEnd = todayStart + 2 * MS_PER_DAY;
    const threeDaysEnd = todayStart + 4 * MS_PER_DAY;
    const sevenDaysEnd = todayStart + 8 * MS_PER_DAY;

    let newCount = 0;
    let learningCount = 0;
    let reviewingCount = 0;
    let masteredCount = 0;

    let todayCount = 0;
    let tomorrowCount = 0;
    let in3DaysCount = 0;
    let in7DaysCount = 0;

    for (const card of cards) {
      const reps = card.repetitions ?? 0;
      const stage = getMemoryStage(reps);
      if (stage === "new") newCount++;
      else if (stage === "learning") learningCount++;
      else if (stage === "reviewing") reviewingCount++;
      else masteredCount++;

      const nextReview = card.nextReview;
      if (typeof nextReview !== "number") {
        todayCount++;
        continue;
      }

      if (nextReview <= todayEnd) {
        todayCount++;
      } else if (nextReview <= tomorrowEnd) {
        tomorrowCount++;
      } else if (nextReview <= threeDaysEnd) {
        in3DaysCount++;
      } else if (nextReview <= sevenDaysEnd) {
        in7DaysCount++;
      }
    }

    return {
      memoryStages: {
        new: newCount,
        learning: learningCount,
        reviewing: reviewingCount,
        mastered: masteredCount,
      },
      reviewForecast: {
        today: todayCount,
        tomorrow: tomorrowCount,
        in3Days: in3DaysCount,
        in7Days: in7DaysCount,
      },
    };
  },
});

/**
 * Returns gamification stats: streak, today's cards, week's cards, accuracy.
 */
export const gamificationStats = query({
  args: { timeZone: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const ninetyDaysAgo = Date.now() - 90 * MS_PER_DAY;
    const sessions = await ctx.db
      .query("studySessions")
      .withIndex("by_user_started", (q) =>
        q.eq("userId", userId).gte("startedAt", ninetyDaysAgo)
      )
      .collect();

    const completedSessions = sessions.filter((s) => s.completedAt != null);

    const todayStart = getStartOfTodayInTimezone(args.timeZone);
    const weekStart = todayStart - 6 * MS_PER_DAY;

    // Build set of days with completed sessions for streak
    const dayKeys = new Set<string>();
    for (const s of completedSessions) {
      dayKeys.add(getDayKey(s.startedAt, args.timeZone));
    }

    // Count streak backwards from today
    let streak = 0;
    let checkTime = todayStart;
    while (true) {
      const key = getDayKey(checkTime, args.timeZone);
      if (dayKeys.has(key)) {
        streak++;
        checkTime -= MS_PER_DAY;
      } else {
        break;
      }
    }

    let todayCards = 0;
    let weekCards = 0;
    let totalCorrect = 0;
    let totalStudied = 0;

    for (const s of completedSessions) {
      if (s.startedAt >= todayStart) todayCards += s.cardsStudied;
      if (s.startedAt >= weekStart) weekCards += s.cardsStudied;
      totalCorrect += s.cardsCorrect;
      totalStudied += s.cardsStudied;
    }

    const accuracyRate =
      totalStudied > 0
        ? Math.round((totalCorrect / totalStudied) * 100)
        : null;

    return { streak, todayCards, weekCards, accuracyRate };
  },
});

/**
 * Returns 90 days of per-day card counts for the activity heatmap.
 */
export const activityHistory = query({
  args: { timeZone: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const ninetyDaysAgo = Date.now() - 90 * MS_PER_DAY;
    const sessions = await ctx.db
      .query("studySessions")
      .withIndex("by_user_started", (q) =>
        q.eq("userId", userId).gte("startedAt", ninetyDaysAgo)
      )
      .collect();

    const completedSessions = sessions.filter((s) => s.completedAt != null);

    const byDay: Record<string, number> = {};
    for (const s of completedSessions) {
      const key = getDayKey(s.startedAt, args.timeZone);
      byDay[key] = (byDay[key] ?? 0) + s.cardsStudied;
    }

    return byDay;
  },
});
