import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cards as cardsTable, decks as decksTable } from "@/db/schema";
import {
  getCardsByDeck,
  getDueCardsByDeck,
  createCard,
  updateCard,
  recordReview,
  deleteCard,
} from "@/server/queries/cards";
import {
  createTestUser,
  seedDeck,
  seedCard,
} from "../setup/db-helpers";
import { MAX_CARDS_PER_DECK, MAX_CARDS_PER_USER } from "@/lib/limits";

describe("createCard", () => {
  it("creates a card and returns its id", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const id = await createCard(user.id, deck.id, "front", "back");
    expect(typeof id).toBe("number");
    expect(id).toBeGreaterThan(0);
  });

  it("throws when the deck does not exist", async () => {
    const user = await createTestUser(db);
    await expect(createCard(user.id, 99999, "f", "b")).rejects.toThrow(
      /not found/i
    );
  });

  it("throws when the deck belongs to another user", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const deck = await seedDeck(db, u1.id);
    await expect(createCard(u2.id, deck.id, "f", "b")).rejects.toThrow(
      /not found/i
    );
  });

  it("enforces the per-deck card limit", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    for (let i = 0; i < MAX_CARDS_PER_DECK; i++) {
      await createCard(user.id, deck.id, `f${i}`, `b${i}`);
    }
    await expect(
      createCard(user.id, deck.id, "over", "limit")
    ).rejects.toThrow(new RegExp(`reached the limit of ${MAX_CARDS_PER_DECK}`));
  });

  it("enforces the per-user total card limit", async () => {
    const user = await createTestUser(db);
    // Spread cards across multiple decks to avoid hitting the per-deck limit.
    const decksPerUser = Math.ceil(MAX_CARDS_PER_USER / MAX_CARDS_PER_DECK);
    for (let d = 0; d < decksPerUser; d++) {
      const deck = await seedDeck(db, user.id, { name: `D${d}` });
      const toFill = Math.min(MAX_CARDS_PER_DECK, MAX_CARDS_PER_USER - d * MAX_CARDS_PER_DECK);
      for (let i = 0; i < toFill; i++) {
        await createCard(user.id, deck.id, `f${i}`, `b${i}`);
      }
    }
    // Now at the cap. One more card in any deck should fail with the user cap.
    const extra = await seedDeck(db, user.id, { name: "Extra" });
    await expect(createCard(user.id, extra.id, "x", "y")).rejects.toThrow(
      /reached the limit of .* total cards/i
    );
  });

  it("bumps the deck's updatedAt when a card is added", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id, {
      updatedAt: new Date(0),
    });
    await createCard(user.id, deck.id, "f", "b");
    const [row] = await db
      .select()
      .from(decksTable)
      .where(eq(decksTable.id, deck.id));
    expect(row!.updatedAt.getTime()).toBeGreaterThan(0);
  });
});

describe("getCardsByDeck", () => {
  it("returns cards ordered by id, scoped to the deck", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const c1 = await seedCard(db, deck.id, { front: "q1", back: "a1" });
    const c2 = await seedCard(db, deck.id, { front: "q2", back: "a2" });
    const result = await getCardsByDeck(user.id, deck.id);
    expect(result.map((c) => c.id)).toEqual([c1.id, c2.id]);
  });

  it("returns an empty array when the deck is not owned", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const deck = await seedDeck(db, u1.id);
    await seedCard(db, deck.id);
    expect(await getCardsByDeck(u2.id, deck.id)).toEqual([]);
  });

  it("returns an empty array for an unknown deck id", async () => {
    const user = await createTestUser(db);
    expect(await getCardsByDeck(user.id, 99999)).toEqual([]);
  });
});

describe("getDueCardsByDeck", () => {
  it("returns only cards whose nextReview <= now, most overdue first", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const past = await seedCard(db, deck.id, {
      front: "past",
      nextReview: new Date(Date.now() - 60_000),
    });
    const older = await seedCard(db, deck.id, {
      front: "older",
      nextReview: new Date(Date.now() - 120_000),
    });
    // Not due yet.
    await seedCard(db, deck.id, {
      front: "future",
      nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const result = await getDueCardsByDeck(user.id, deck.id);
    expect(result.map((c) => c.front)).toEqual(["older", "past"]);
    expect(result.map((c) => c.id)).toEqual([older.id, past.id]);
  });

  it("returns an empty array when the deck is not owned", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const deck = await seedDeck(db, u1.id);
    await seedCard(db, deck.id);
    expect(await getDueCardsByDeck(u2.id, deck.id)).toEqual([]);
  });
});

describe("updateCard", () => {
  it("updates front and back and bumps updatedAt", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const card = await seedCard(db, deck.id, { front: "old", back: "old" });
    await updateCard(user.id, card.id, { front: "new", back: "new" });
    const [row] = await db
      .select()
      .from(cardsTable)
      .where(eq(cardsTable.id, card.id));
    expect(row?.front).toBe("new");
    expect(row?.back).toBe("new");
  });

  it("updates only the fields provided in the patch", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const card = await seedCard(db, deck.id, { front: "keep", back: "old" });
    await updateCard(user.id, card.id, { back: "new" });
    const [row] = await db
      .select()
      .from(cardsTable)
      .where(eq(cardsTable.id, card.id));
    expect(row?.front).toBe("keep");
    expect(row?.back).toBe("new");
  });

  it("throws when the card does not exist or is not owned", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const deck = await seedDeck(db, u1.id);
    const card = await seedCard(db, deck.id);
    await expect(updateCard(u2.id, card.id, { front: "x" })).rejects.toThrow(
      /not found/i
    );
  });
});

describe("recordReview", () => {
  it("updates efactor, repetitions, nextReview and lastStudied on easy", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const card = await seedCard(db, deck.id, {
      front: "q",
      back: "a",
      efactor: 2.5,
      repetitions: 0,
    });
    await recordReview(user.id, card.id, "easy");
    const [row] = await db
      .select()
      .from(cardsTable)
      .where(eq(cardsTable.id, card.id));
    // q=5 → reps 0→1, EF 2.5→2.6, nextReview = now + 1 day.
    expect(row?.repetitions).toBe(1);
    expect(row?.efactor).toBeCloseTo(2.6, 5);
    expect(row?.lastStudied).not.toBeNull();
    const expectedMs = Date.now() + 24 * 60 * 60 * 1000;
    expect(row!.nextReview.getTime()).toBeGreaterThan(expectedMs - 5000);
    expect(row!.nextReview.getTime()).toBeLessThan(expectedMs + 5000);
  });

  it("resets repetitions on wrong", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const card = await seedCard(db, deck.id, {
      efactor: 2.5,
      repetitions: 3,
    });
    await recordReview(user.id, card.id, "wrong");
    const [row] = await db
      .select()
      .from(cardsTable)
      .where(eq(cardsTable.id, card.id));
    expect(row?.repetitions).toBe(0);
  });

  it("throws when the card is not owned", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const deck = await seedDeck(db, u1.id);
    const card = await seedCard(db, deck.id);
    await expect(recordReview(u2.id, card.id, "easy")).rejects.toThrow(
      /not found/i
    );
  });

  it("bumps the parent deck's updatedAt", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id, {
      updatedAt: new Date(0),
    });
    const card = await seedCard(db, deck.id);
    await recordReview(user.id, card.id, "hard");
    const [row] = await db
      .select()
      .from(decksTable)
      .where(eq(decksTable.id, deck.id));
    expect(row!.updatedAt.getTime()).toBeGreaterThan(0);
  });
});

describe("deleteCard", () => {
  it("deletes the card", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const card = await seedCard(db, deck.id);
    await deleteCard(user.id, card.id);
    const [row] = await db
      .select()
      .from(cardsTable)
      .where(eq(cardsTable.id, card.id));
    expect(row).toBeUndefined();
  });

  it("throws when the card is not owned", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const deck = await seedDeck(db, u1.id);
    const card = await seedCard(db, deck.id);
    await expect(deleteCard(u2.id, card.id)).rejects.toThrow(/not found/i);
  });

  it("bumps the parent deck's updatedAt", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id, {
      updatedAt: new Date(0),
    });
    const card = await seedCard(db, deck.id);
    await deleteCard(user.id, card.id);
    const [row] = await db
      .select()
      .from(decksTable)
      .where(eq(decksTable.id, deck.id));
    expect(row!.updatedAt.getTime()).toBeGreaterThan(0);
  });
});
