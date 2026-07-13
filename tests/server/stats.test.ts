import { describe, it, expect } from "vitest";
import { db } from "@/db";
import {
  dashboardStats,
  deckStats,
  gamificationStats,
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
    expect(stats).toEqual({
      memoryStages: { new: 0, learning: 0, reviewing: 0, mastered: 0 },
      reviewForecast: { today: 0, tomorrow: 0, in3Days: 0, in7Days: 0 },
    });
  });

  it("classifies cards into memory stages by repetitions", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    await seedCard(db, deck.id, { repetitions: 0 }); // New
    await seedCard(db, deck.id, { repetitions: 1 }); // Learning
    await seedCard(db, deck.id, { repetitions: 2 }); // Learning
    await seedCard(db, deck.id, { repetitions: 3 }); // Reviewing
    await seedCard(db, deck.id, { repetitions: 5 }); // Reviewing
    await seedCard(db, deck.id, { repetitions: 6 }); // Mastered
    const stats = await dashboardStats(user.id, TZ);
    expect(stats.memoryStages).toEqual({
      new: 1,
      learning: 2,
      reviewing: 2,
      mastered: 1,
    });
  });

  it("counts review forecast by nextReview buckets", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const now = Date.now();
    await seedCard(db, deck.id, { nextReview: new Date(now - 1000) }); // today
    await seedCard(db, deck.id, {
      nextReview: new Date(now + 1 * MS_PER_DAY + 1000),
    }); // tomorrow
    await seedCard(db, deck.id, {
      nextReview: new Date(now + 3 * MS_PER_DAY),
    }); // in3Days
    await seedCard(db, deck.id, {
      nextReview: new Date(now + 7 * MS_PER_DAY),
    }); // in7Days
    await seedCard(db, deck.id, {
      nextReview: new Date(now + 30 * MS_PER_DAY),
    }); // beyond
    const stats = await dashboardStats(user.id, TZ);
    expect(stats.reviewForecast.today).toBe(1);
    expect(stats.reviewForecast.tomorrow).toBe(1);
    expect(stats.reviewForecast.in3Days).toBe(1);
    expect(stats.reviewForecast.in7Days).toBe(1);
  });

  it("only counts the calling user's cards", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const d1 = await seedDeck(db, u1.id);
    const d2 = await seedDeck(db, u2.id);
    await seedCard(db, d1.id, { repetitions: 0 });
    await seedCard(db, d2.id, { repetitions: 6 });
    const stats = await dashboardStats(u1.id, TZ);
    expect(stats.memoryStages.mastered).toBe(0);
    expect(stats.memoryStages.new).toBe(1);
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
    await seedCard(db, d1.id, { repetitions: 6 });
    // d2 cards should be excluded.
    await seedCard(db, d2.id, { repetitions: 0 });
    await seedCard(db, d2.id, { repetitions: 0 });
    const stats = await deckStats(user.id, d1.id, TZ);
    expect(stats?.memoryStages).toEqual({
      new: 1,
      learning: 0,
      reviewing: 0,
      mastered: 1,
    });
  });
});

describe("gamificationStats", () => {
  it("returns zeroes when the user has no sessions", async () => {
    const user = await createTestUser(db);
    const stats = await gamificationStats(user.id, TZ);
    expect(stats).toEqual({
      streak: 0,
      todayCards: 0,
      weekCards: 0,
      accuracyRate: null,
    });
  });

  it("aggregates today/week card counts from completed sessions", async () => {
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
      startedAt: new Date(now.getTime() - 3 * MS_PER_DAY),
      completedAt: new Date(now.getTime() - 3 * MS_PER_DAY),
      cardsStudied: 10,
      cardsCorrect: 8,
      cardsIncorrect: 2,
    });
    const stats = await gamificationStats(user.id, TZ);
    expect(stats?.todayCards).toBe(5);
    expect(stats?.weekCards).toBe(15);
    expect(stats?.accuracyRate).toBe(Math.round(((4 + 8) / 15) * 100));
  });

  it("computes a streak from consecutive day-key sessions", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const now = new Date();
    // Sessions today, yesterday, the day before — streak 3.
    for (let i = 0; i < 3; i++) {
      const t = new Date(now.getTime() - i * MS_PER_DAY);
      await seedSession(db, user.id, {
        deckId: deck.id,
        startedAt: t,
        completedAt: t,
        cardsStudied: 1,
        cardsCorrect: 0,
        cardsIncorrect: 1,
      });
    }
    const stats = await gamificationStats(user.id, TZ);
    expect(stats?.streak).toBe(3);
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
    const stats = await gamificationStats(user.id, TZ);
    expect(stats?.todayCards).toBe(0);
    expect(stats?.streak).toBe(0);
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
      cardsIncorrect: 0,
    });
    await seedSession(db, u2.id, {
      deckId: d2.id,
      startedAt: now,
      completedAt: now,
      cardsStudied: 100,
      cardsCorrect: 0,
      cardsIncorrect: 100,
    });
    const stats = await gamificationStats(u1.id, TZ);
    expect(stats?.todayCards).toBe(5);
    expect(stats?.accuracyRate).toBe(100);
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
});
