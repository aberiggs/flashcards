import { describe, it, expect } from "vitest";
import { db } from "@/db";
import {
  dashboardStats,
  deckStats,
  intervalStats,
  deckIntervalStats,
  activityHistory,
} from "@/server/queries/stats";
import {
  createTestUser,
  seedDeck,
  seedCard,
  seedSession,
} from "../setup/db-helpers";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TZ = "UTC";

describe("dashboardStats", () => {
  it("returns zeroed stats for a user with no cards", async () => {
    const user = await createTestUser(db);
    const stats = await dashboardStats(user.id, TZ);
    expect(stats.memoryStages).toEqual({
      acorn: 0,
      sprout: 0,
      sapling: 0,
      tree: 0,
      grove: 0,
      forest: 0,
    });
    expect(stats.reviewForecast).toHaveLength(30);
    expect(stats.reviewForecast.every((d) => d.count === 0)).toBe(true);
  });

  it("classifies cards into tiers by repetitions", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    await seedCard(db, deck.id, { repetitions: 0 }); // Acorn
    await seedCard(db, deck.id, { repetitions: 1 }); // Sprout
    await seedCard(db, deck.id, { repetitions: 2 }); // Sapling
    await seedCard(db, deck.id, { repetitions: 3 }); // Tree
    await seedCard(db, deck.id, { repetitions: 4 }); // Tree
    await seedCard(db, deck.id, { repetitions: 5 }); // Grove
    await seedCard(db, deck.id, { repetitions: 7 }); // Grove
    await seedCard(db, deck.id, { repetitions: 8 }); // Forest
    await seedCard(db, deck.id, { repetitions: 20 }); // Forest
    const stats = await dashboardStats(user.id, TZ);
    expect(stats.memoryStages).toEqual({
      acorn: 1,
      sprout: 1,
      sapling: 1,
      tree: 2,
      grove: 2,
      forest: 2,
    });
  });

  it("builds a 30-day per-day forecast from nextReview", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const now = Date.now();
    const todayStart = Math.floor(now / MS_PER_DAY) * MS_PER_DAY;
    await seedCard(db, deck.id, { nextReview: new Date(now - MS_PER_DAY) }); // overdue -> today
    await seedCard(db, deck.id, { nextReview: new Date(now + 1000) }); // today
    await seedCard(db, deck.id, {
      nextReview: new Date(todayStart + 1 * MS_PER_DAY + 1000),
    }); // day 2
    await seedCard(db, deck.id, {
      nextReview: new Date(todayStart + 5 * MS_PER_DAY),
    }); // day 6
    await seedCard(db, deck.id, {
      nextReview: new Date(todayStart + 29 * MS_PER_DAY),
    }); // day 30 (last bucket)
    await seedCard(db, deck.id, {
      nextReview: new Date(todayStart + 30 * MS_PER_DAY),
    }); // beyond horizon — excluded
    const stats = await dashboardStats(user.id, TZ);
    expect(stats.reviewForecast).toHaveLength(30);
    const today = stats.reviewForecast[0];
    expect(today.count).toBe(2); // overdue + today
    expect(stats.reviewForecast[1].count).toBe(1); // day 2
    expect(stats.reviewForecast[5].count).toBe(1); // day 6
    expect(stats.reviewForecast[29].count).toBe(1); // last bucket
    const total = stats.reviewForecast.reduce((s, d) => s + d.count, 0);
    expect(total).toBe(5);
  });

  it("24h horizon returns 24 hour-buckets tagged bucket='hour'", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const now = Date.now();
    const MS_PER_HOUR = 60 * 60 * 1000;
    const hourStart = Math.floor(now / MS_PER_HOUR) * MS_PER_HOUR;
    // Overdue (rolls into current hour bucket).
    await seedCard(db, deck.id, { nextReview: new Date(now - MS_PER_HOUR) });
    // Current hour.
    await seedCard(db, deck.id, { nextReview: new Date(now + 1000) });
    // 3 hours from now.
    await seedCard(db, deck.id, {
      nextReview: new Date(hourStart + 3 * MS_PER_HOUR + 1000),
    });
    // 25 hours from now — beyond horizon, excluded.
    await seedCard(db, deck.id, {
      nextReview: new Date(hourStart + 25 * MS_PER_HOUR),
    });
    const stats = await dashboardStats(user.id, TZ, "24h");
    expect(stats.reviewForecast).toHaveLength(24);
    expect(stats.reviewForecast.every((b) => b.bucket === "hour")).toBe(true);
    expect(stats.reviewForecast[0].count).toBe(2); // overdue + current
    expect(stats.reviewForecast[3].count).toBe(1);
    const total = stats.reviewForecast.reduce((s, d) => s + d.count, 0);
    expect(total).toBe(3);
  });

  it("24h horizon produces empty buckets for a user with no due cards", async () => {
    const user = await createTestUser(db);
    const stats = await dashboardStats(user.id, TZ, "24h");
    expect(stats.reviewForecast).toHaveLength(24);
    expect(stats.reviewForecast.every((b) => b.bucket === "hour")).toBe(true);
    expect(stats.reviewForecast.every((b) => b.count === 0)).toBe(true);
  });

  it("only counts the calling user's cards", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const d1 = await seedDeck(db, u1.id);
    const d2 = await seedDeck(db, u2.id);
    await seedCard(db, d1.id, { repetitions: 0 });
    await seedCard(db, d2.id, { repetitions: 8 });
    const stats = await dashboardStats(u1.id, TZ);
    expect(stats.memoryStages.forest).toBe(0);
    expect(stats.memoryStages.acorn).toBe(1);
  });
});

describe("deckStats", () => {
  it("returns null when the deck does not exist or is not owned", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const deck = await seedDeck(db, u1.id);
    expect(await deckStats(u2.id, deck.id, TZ)).toBeNull();
  });

  it("scopes memory stages + forecast to the given deck", async () => {
    const user = await createTestUser(db);
    const d1 = await seedDeck(db, user.id, { name: "D1" });
    const d2 = await seedDeck(db, user.id, { name: "D2" });
    await seedCard(db, d1.id, { repetitions: 0 });
    await seedCard(db, d1.id, { repetitions: 8 });
    // d2 cards should be excluded.
    await seedCard(db, d2.id, { repetitions: 0 });
    await seedCard(db, d2.id, { repetitions: 0 });
    const stats = await deckStats(user.id, d1.id, TZ);
    expect(stats?.memoryStages).toEqual({
      acorn: 1,
      sprout: 0,
      sapling: 0,
      tree: 0,
      grove: 0,
      forest: 1,
    });
    expect(stats?.reviewForecast).toHaveLength(30);
  });
});

describe("intervalStats", () => {
  it("returns zeroed stats for a user with no sessions", async () => {
    const user = await createTestUser(db);
    const stats = await intervalStats(user.id, TZ);
    expect(stats).toEqual({
      "1w": {
        sessions: 0,
        cardsReviewed: 0,
        cardsCorrect: 0,
        accuracyRate: null,
        prevCardsReviewed: 0,
        cardsDeltaPct: null,
      },
      "1m": {
        sessions: 0,
        cardsReviewed: 0,
        cardsCorrect: 0,
        accuracyRate: null,
        prevCardsReviewed: 0,
        cardsDeltaPct: null,
      },
      "1y": {
        sessions: 0,
        cardsReviewed: 0,
        cardsCorrect: 0,
        accuracyRate: null,
        prevCardsReviewed: 0,
        cardsDeltaPct: null,
      },
    });
  });

  it("aggregates 1w sessions, cards, and accuracy", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const now = new Date();
    await seedSession(db, user.id, {
      deckId: deck.id,
      startedAt: now,
      completedAt: now,
      cardsStudied: 5,
      cardsCorrect: 4,
      cardsIncorrect: 1,
    });
    await seedSession(db, user.id, {
      deckId: deck.id,
      startedAt: new Date(now.getTime() - 2 * MS_PER_DAY),
      completedAt: new Date(now.getTime() - 2 * MS_PER_DAY),
      cardsStudied: 10,
      cardsCorrect: 8,
      cardsIncorrect: 2,
    });
    // Previous week session (8 days ago).
    await seedSession(db, user.id, {
      deckId: deck.id,
      startedAt: new Date(now.getTime() - 8 * MS_PER_DAY),
      completedAt: new Date(now.getTime() - 8 * MS_PER_DAY),
      cardsStudied: 7,
      cardsCorrect: 7,
      cardsIncorrect: 0,
    });
    const stats = await intervalStats(user.id, TZ);
    const week = stats["1w"];
    expect(week.sessions).toBe(2);
    expect(week.cardsReviewed).toBe(15);
    expect(week.cardsCorrect).toBe(12);
    expect(week.accuracyRate).toBe(Math.round((12 / 15) * 100));
    expect(week.prevCardsReviewed).toBe(7);
    // (15 - 7) / 7 * 100 = 114.28 -> 114
    expect(week.cardsDeltaPct).toBe(114);
  });

  it("computes null delta when previous interval had zero reviews", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const now = new Date();
    await seedSession(db, user.id, {
      deckId: deck.id,
      startedAt: now,
      completedAt: now,
      cardsStudied: 3,
      cardsCorrect: 3,
    });
    const stats = await intervalStats(user.id, TZ);
    expect(stats["1w"].cardsDeltaPct).toBeNull();
    expect(stats["1w"].prevCardsReviewed).toBe(0);
  });

  it("computes negative delta when current is less than previous", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const now = new Date();
    // Previous week: 10 cards.
    await seedSession(db, user.id, {
      deckId: deck.id,
      startedAt: new Date(now.getTime() - 8 * MS_PER_DAY),
      completedAt: new Date(now.getTime() - 8 * MS_PER_DAY),
      cardsStudied: 10,
      cardsCorrect: 10,
    });
    // This week: 5 cards.
    await seedSession(db, user.id, {
      deckId: deck.id,
      startedAt: now,
      completedAt: now,
      cardsStudied: 5,
      cardsCorrect: 5,
    });
    const stats = await intervalStats(user.id, TZ);
    // (5 - 10) / 10 * 100 = -50
    expect(stats["1w"].cardsDeltaPct).toBe(-50);
  });

  it("ignores incomplete (not completed) sessions", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const now = new Date();
    await seedSession(db, user.id, {
      deckId: deck.id,
      startedAt: now,
      completedAt: null,
      cardsStudied: 99,
    });
    const stats = await intervalStats(user.id, TZ);
    expect(stats["1w"].cardsReviewed).toBe(0);
    expect(stats["1w"].sessions).toBe(0);
  });

  it("scopes to the calling user", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const d1 = await seedDeck(db, u1.id);
    const d2 = await seedDeck(db, u2.id);
    const now = new Date();
    await seedSession(db, u1.id, {
      deckId: d1.id,
      startedAt: now,
      completedAt: now,
      cardsStudied: 5,
      cardsCorrect: 5,
    });
    await seedSession(db, u2.id, {
      deckId: d2.id,
      startedAt: now,
      completedAt: now,
      cardsStudied: 100,
      cardsCorrect: 0,
    });
    const stats = await intervalStats(u1.id, TZ);
    expect(stats["1w"].cardsReviewed).toBe(5);
    expect(stats["1w"].accuracyRate).toBe(100);
  });
});

describe("deckIntervalStats", () => {
  it("returns null when the deck is not owned", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const deck = await seedDeck(db, u1.id);
    expect(await deckIntervalStats(u2.id, deck.id, TZ)).toBeNull();
  });

  it("scopes to the given deck", async () => {
    const user = await createTestUser(db);
    const d1 = await seedDeck(db, user.id, { name: "D1" });
    const d2 = await seedDeck(db, user.id, { name: "D2" });
    const now = new Date();
    await seedSession(db, user.id, {
      deckId: d1.id,
      startedAt: now,
      completedAt: now,
      cardsStudied: 4,
      cardsCorrect: 4,
    });
    await seedSession(db, user.id, {
      deckId: d2.id,
      startedAt: now,
      completedAt: now,
      cardsStudied: 20,
      cardsCorrect: 0,
    });
    const stats = await deckIntervalStats(user.id, d1.id, TZ);
    expect(stats?.["1w"].cardsReviewed).toBe(4);
    expect(stats?.["1w"].accuracyRate).toBe(100);
  });
});

describe("activityHistory", () => {
  it("returns an empty record when there are no sessions", async () => {
    const user = await createTestUser(db);
    expect(await activityHistory(user.id, TZ)).toEqual({});
  });

  it("groups card counts by day key in the given timezone", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const now = new Date();
    const yesterday = new Date(now.getTime() - MS_PER_DAY);
    await seedSession(db, user.id, {
      deckId: deck.id,
      startedAt: now,
      completedAt: now,
      cardsStudied: 4,
    });
    await seedSession(db, user.id, {
      deckId: deck.id,
      startedAt: now,
      completedAt: now,
      cardsStudied: 6,
    });
    await seedSession(db, user.id, {
      deckId: deck.id,
      startedAt: yesterday,
      completedAt: yesterday,
      cardsStudied: 2,
    });
    const history = await activityHistory(user.id, TZ);
    expect(history).not.toBeNull();
    const todayKey = Object.keys(history!).sort().pop()!;
    expect(history![todayKey]).toBe(10);
  });

  it("ignores incomplete sessions", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const now = new Date();
    await seedSession(db, user.id, {
      deckId: deck.id,
      startedAt: now,
      completedAt: null,
      cardsStudied: 99,
    });
    expect(await activityHistory(user.id, TZ)).toEqual({});
  });

  it("includes sessions up to 182 days ago but excludes older ones", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const now = new Date();
    // 181 days ago — just inside the 182-day window
    await seedSession(db, user.id, {
      deckId: deck.id,
      startedAt: new Date(now.getTime() - 181 * MS_PER_DAY),
      completedAt: new Date(now.getTime() - 181 * MS_PER_DAY),
      cardsStudied: 3,
    });
    // 183 days ago — just outside the window
    await seedSession(db, user.id, {
      deckId: deck.id,
      startedAt: new Date(now.getTime() - 183 * MS_PER_DAY),
      completedAt: new Date(now.getTime() - 183 * MS_PER_DAY),
      cardsStudied: 99,
    });
    const history = await activityHistory(user.id, TZ);
    expect(history).not.toBeNull();
    const totalCards = Object.values(history!).reduce((sum, c) => sum + c, 0);
    expect(totalCards).toBe(3);
  });
});