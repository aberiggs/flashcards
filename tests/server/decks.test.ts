import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { decks as decksTable } from "@/db/schema";
import {
  listDecks,
  getDeck,
  getDeckWithCards,
  createDeck,
  updateDeck,
  deleteDeck,
} from "@/server/queries/decks";
import { createTestUser, seedDeck, seedCard } from "../setup/db-helpers";
import { MAX_DECKS_PER_USER } from "@/lib/limits";

describe("createDeck", () => {
  it("creates a deck and returns its id", async () => {
    const user = await createTestUser(db);
    const id = await createDeck(user.id, "Spanish Vocab");
    expect(typeof id).toBe("number");
    expect(id).toBeGreaterThan(0);

    const [row] = await db
      .select()
      .from(decksTable)
      .where(eq(decksTable.id, id));
    expect(row?.name).toBe("Spanish Vocab");
    expect(row?.userId).toBe(user.id);
  });

  it("stores description when provided", async () => {
    const user = await createTestUser(db);
    const id = await createDeck(user.id, "Spanish", "Basic vocabulary");
    const [row] = await db
      .select()
      .from(decksTable)
      .where(eq(decksTable.id, id));
    expect(row?.description).toBe("Basic vocabulary");
  });

  it("trims the deck name", async () => {
    const user = await createTestUser(db);
    const id = await createDeck(user.id, "  Padded  ");
    const [row] = await db
      .select()
      .from(decksTable)
      .where(eq(decksTable.id, id));
    expect(row?.name).toBe("Padded");
  });

  it("throws when the name is empty/whitespace", async () => {
    const user = await createTestUser(db);
    await expect(createDeck(user.id, "   ")).rejects.toThrow(/cannot be empty/i);
  });

  it("enforces the per-user deck limit", async () => {
    const user = await createTestUser(db);
    for (let i = 0; i < MAX_DECKS_PER_USER; i++) {
      await createDeck(user.id, `Deck ${i}`);
    }
    await expect(createDeck(user.id, "Over the limit")).rejects.toThrow(
      new RegExp(`reached the limit of ${MAX_DECKS_PER_USER} decks`)
    );
  });

  it("counts are scoped per user — a second user starts fresh", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    for (let i = 0; i < MAX_DECKS_PER_USER; i++) {
      await createDeck(u1.id, `U1 Deck ${i}`);
    }
    // u2 is unaffected and can still create decks.
    const id = await createDeck(u2.id, "U2 Deck");
    expect(id).toBeGreaterThan(0);
  });
});

describe("getDeck", () => {
  it("returns the deck for the owning user", async () => {
    const user = await createTestUser(db);
    const created = await seedDeck(db, user.id, { name: "Owned" });
    const deck = await getDeck(user.id, created.id);
    expect(deck?.id).toBe(created.id);
    expect(deck?.name).toBe("Owned");
  });

  it("returns null when the deck does not exist", async () => {
    const user = await createTestUser(db);
    expect(await getDeck(user.id, 999999)).toBeNull();
  });

  it("returns null when the deck belongs to another user", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const created = await seedDeck(db, u1.id, { name: "U1 Deck" });
    expect(await getDeck(u2.id, created.id)).toBeNull();
  });
});

describe("getDeckWithCards", () => {
  it("returns the deck with its cards ordered by id", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const c1 = await seedCard(db, deck.id, { front: "q1", back: "a1" });
    const c2 = await seedCard(db, deck.id, { front: "q2", back: "a2" });
    const result = await getDeckWithCards(user.id, deck.id);
    expect(result?.cards.map((c) => c.id)).toEqual([c1.id, c2.id]);
  });

  it("returns null when the deck belongs to another user", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const deck = await seedDeck(db, u1.id);
    expect(await getDeckWithCards(u2.id, deck.id)).toBeNull();
  });

  it("returns an empty cards array for a deck with no cards", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const result = await getDeckWithCards(user.id, deck.id);
    expect(result?.cards).toEqual([]);
  });
});

describe("listDecks", () => {
  it("returns decks scoped to the user with aggregated stats", async () => {
    const user = await createTestUser(db);
    const d1 = await seedDeck(db, user.id, { name: "Alpha" });
    const d2 = await seedDeck(db, user.id, { name: "Beta" });
    await seedCard(db, d1.id, { front: "q", back: "a" });
    // d2 has no cards.
    const result = await listDecks(user.id);
    expect(result.map((d) => d.name)).toEqual(["Alpha", "Beta"]);
    expect(result[0].cardCount).toBe(1);
    expect(result[1].cardCount).toBe(0);
  });

  it("orders decks by id ascending", async () => {
    const user = await createTestUser(db);
    const first = await seedDeck(db, user.id, { name: "First" });
    const second = await seedDeck(db, user.id, { name: "Second" });
    const result = await listDecks(user.id);
    expect(result.map((d) => d.id)).toEqual([first.id, second.id]);
  });

  it("reports dueCount for cards whose nextReview <= now", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    // A card due now (nextReview defaults to now in seedCard).
    await seedCard(db, deck.id, { nextReview: new Date(Date.now() - 1000) });
    // A card not yet due.
    await seedCard(db, deck.id, {
      nextReview: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const result = await listDecks(user.id);
    expect(result[0].cardCount).toBe(2);
    expect(result[0].dueCount).toBe(1);
  });

  it("returns an empty array when the user has no decks", async () => {
    const user = await createTestUser(db);
    expect(await listDecks(user.id)).toEqual([]);
  });

  it("does not leak other users' decks", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    await seedDeck(db, u1.id, { name: "U1 Only" });
    const u2Decks = await listDecks(u2.id);
    expect(u2Decks.map((d) => d.name)).not.toContain("U1 Only");
  });
});

describe("updateDeck", () => {
  it("updates name and description and bumps updatedAt", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id, { name: "Old", description: null });
    const before = await getDeck(user.id, deck.id);
    await updateDeck(user.id, deck.id, {
      name: "New Name",
      description: "New desc",
    });
    const after = await getDeck(user.id, deck.id);
    expect(after?.name).toBe("New Name");
    expect(after?.description).toBe("New desc");
    expect(after!.updatedAt.getTime()).toBeGreaterThanOrEqual(
      before!.updatedAt.getTime()
    );
  });

  it("clears description when given an empty string", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id, {
      name: "D",
      description: "old",
    });
    await updateDeck(user.id, deck.id, { description: "" });
    const after = await getDeck(user.id, deck.id);
    expect(after?.description).toBeNull();
  });

  it("trims the name and rejects empty", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    await expect(updateDeck(user.id, deck.id, { name: "   " })).rejects.toThrow(
      /cannot be empty/i
    );
  });

  it("throws when the deck does not exist or is not owned", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const deck = await seedDeck(db, u1.id);
    await expect(updateDeck(u2.id, deck.id, { name: "Hijack" })).rejects.toThrow(
      /not found/i
    );
  });

  it("no-ops fields that are not in the patch", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id, { name: "Keep", description: "d" });
    await updateDeck(user.id, deck.id, { name: "Changed" });
    const after = await getDeck(user.id, deck.id);
    expect(after?.name).toBe("Changed");
    // description untouched.
    expect(after?.description).toBe("d");
  });
});

describe("deleteDeck", () => {
  it("deletes the deck", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    await deleteDeck(user.id, deck.id);
    expect(await getDeck(user.id, deck.id)).toBeNull();
  });

  it("cascades to cards via ON DELETE CASCADE", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    await seedCard(db, deck.id);
    await deleteDeck(user.id, deck.id);
    const withCards = await getDeckWithCards(user.id, deck.id);
    expect(withCards).toBeNull();
  });

  it("throws when the deck does not exist or is not owned", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const deck = await seedDeck(db, u1.id);
    await expect(deleteDeck(u2.id, deck.id)).rejects.toThrow(/not found/i);
  });
});