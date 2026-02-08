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
