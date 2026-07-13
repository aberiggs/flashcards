import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { decks, cards } from "@/db/schema";
import { importDeck } from "@/server/queries/import";
import { createTestUser, seedDeck } from "../setup/db-helpers";
import {
  MAX_CARDS_PER_DECK,
  MAX_CARDS_PER_USER,
  MAX_DECKS_PER_USER,
} from "@/lib/limits";

describe("importDeck", () => {
  it("creates a deck and its cards, returning the deck id", async () => {
    const user = await createTestUser(db);
    const id = await importDeck(user.id, "Imported", "desc", [
      { front: "hola", back: "hello" },
      { front: "adios", back: "goodbye" },
    ]);
    expect(typeof id).toBe("number");
    const [deck] = await db.select().from(decks).where(eq(decks.id, id));
    expect(deck?.name).toBe("Imported");
    expect(deck?.description).toBe("desc");
    const deckCards = await db.select().from(cards).where(eq(cards.deckId, id));
    expect(deckCards.map((c) => c.front)).toEqual(["hola", "adios"]);
  });

  it("trims the deck name and rejects empty", async () => {
    const user = await createTestUser(db);
    await expect(
      importDeck(user.id, "   ", undefined, [{ front: "a", back: "b" }])
    ).rejects.toThrow(/cannot be empty/i);
  });

  it("defaults efactor/repetitions/nextReview when not provided", async () => {
    const user = await createTestUser(db);
    const id = await importDeck(user.id, "D", undefined, [
      { front: "a", back: "b" },
    ]);
    const [card] = await db.select().from(cards).where(eq(cards.deckId, id));
    expect(card?.efactor).toBe(2.5);
    expect(card?.repetitions).toBe(0);
    expect(card?.nextReview).not.toBeNull();
    expect(card?.lastStudied).toBeNull();
  });

  it("preserves provided SM-2 state fields", async () => {
    const user = await createTestUser(db);
    const id = await importDeck(user.id, "D", undefined, [
      {
        front: "a",
        back: "b",
        efactor: 2.3,
        repetitions: 5,
        nextReview: 1700000000000,
        lastStudied: 1690000000000,
      },
    ]);
    const [card] = await db.select().from(cards).where(eq(cards.deckId, id));
    expect(card?.efactor).toBe(2.3);
    expect(card?.repetitions).toBe(5);
    expect(card?.nextReview.getTime()).toBe(1700000000000);
    expect(card?.lastStudied?.getTime()).toBe(1690000000000);
  });

  it("throws when the per-deck card limit is exceeded", async () => {
    const user = await createTestUser(db);
    const tooMany = Array.from({ length: MAX_CARDS_PER_DECK + 1 }, (_, i) => ({
      front: `f${i}`,
      back: `b${i}`,
    }));
    await expect(importDeck(user.id, "D", undefined, tooMany)).rejects.toThrow(
      new RegExp(`exceeds the limit of ${MAX_CARDS_PER_DECK} cards per deck`)
    );
  });

  it("throws when the per-user deck count is at the limit", async () => {
    const user = await createTestUser(db);
    for (let i = 0; i < MAX_DECKS_PER_USER; i++) {
      await seedDeck(db, user.id, { name: `D${i}` });
    }
    await expect(
      importDeck(user.id, "New", undefined, [{ front: "a", back: "b" }])
    ).rejects.toThrow(new RegExp(`reached the limit of ${MAX_DECKS_PER_USER}`));
  });

  it("throws when the import would exceed the total user card limit", async () => {
    const user = await createTestUser(db);
    // Fill up to MAX_CARDS_PER_USER minus a few, spread across decks.
    const remaining = MAX_CARDS_PER_USER - 5;
    const decksNeeded = Math.ceil(remaining / MAX_CARDS_PER_DECK);
    for (let d = 0; d < decksNeeded; d++) {
      const deck = await seedDeck(db, user.id, { name: `D${d}` });
      const toFill = Math.min(MAX_CARDS_PER_DECK, remaining - d * MAX_CARDS_PER_DECK);
      for (let i = 0; i < toFill; i++) {
        await db.insert(cards).values({
          deckId: deck.id,
          front: `f${i}`,
          back: `b${i}`,
        });
      }
    }
    // Importing 10 more cards should fail (only 5 slots left).
    await expect(
      importDeck(
        user.id,
        "Overflow",
        undefined,
        Array.from({ length: 10 }, (_, i) => ({ front: `n${i}`, back: `m${i}` }))
      )
    ).rejects.toThrow(/would exceed your total limit of .* cards/i);
  });

  it("scopes deck-count and card-count checks to the calling user", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    // u1 is at the deck limit, u2 is not.
    for (let i = 0; i < MAX_DECKS_PER_USER; i++) {
      await seedDeck(db, u1.id, { name: `U1 D${i}` });
    }
    // u2 can still import.
    const id = await importDeck(u2.id, "U2 Import", undefined, [
      { front: "a", back: "b" },
    ]);
    expect(id).toBeGreaterThan(0);
  });
});