import { describe, it, expect } from "vitest";
import { db } from "@/db";
import { search } from "@/server/queries/search";
import { createTestUser, seedDeck, seedCard } from "../setup/db-helpers";

describe("search", () => {
  it("returns empty result for queries shorter than 2 chars", async () => {
    const user = await createTestUser(db);
    const result = await search(user.id, "a");
    expect(result).toEqual({ decks: [], cards: [] });
  });

  it("matches decks by name", async () => {
    const user = await createTestUser(db);
    await seedDeck(db, user.id, { name: "Spanish Vocab", description: null });
    await seedDeck(db, user.id, { name: "French Vocab", description: null });
    const result = await search(user.id, "spanish");
    expect(result.decks.map((d) => d.name)).toEqual(["Spanish Vocab"]);
  });

  it("matches decks by description", async () => {
    const user = await createTestUser(db);
    await seedDeck(db, user.id, {
      name: "Deck A",
      description: "Beginner Spanish",
    });
    const result = await search(user.id, "spanish");
    expect(result.decks.map((d) => d.name)).toEqual(["Deck A"]);
  });

  it("matches cards by front", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id, { name: "D" });
    await seedCard(db, deck.id, { front: "hola", back: "hello" });
    await seedCard(db, deck.id, { front: "adios", back: "goodbye" });
    const result = await search(user.id, "hola");
    expect(result.cards.map((c) => c.front)).toEqual(["hola"]);
  });

  it("matches cards by back", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id, { name: "D" });
    await seedCard(db, deck.id, { front: "hola", back: "hello world" });
    const result = await search(user.id, "world");
    expect(result.cards.map((c) => c.front)).toEqual(["hola"]);
  });

  it("includes deckName in card results", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id, { name: "MyDeck" });
    await seedCard(db, deck.id, { front: "alpha", back: "beta" });
    const result = await search(user.id, "alpha");
    expect(result.cards[0].deckName).toBe("MyDeck");
    expect(result.cards[0].deckId).toBe(deck.id);
  });

  it("includes cardCount in deck results", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id, { name: "Matchable" });
    await seedCard(db, deck.id, { front: "c1", back: "b1" });
    await seedCard(db, deck.id, { front: "c2", back: "b2" });
    const result = await search(user.id, "matchable");
    expect(result.decks[0].cardCount).toBe(2);
  });

  it("is case-insensitive", async () => {
    const user = await createTestUser(db);
    await seedDeck(db, user.id, { name: "Spanish", description: null });
    expect((await search(user.id, "SPANISH")).decks).toHaveLength(1);
    expect((await search(user.id, "spanish")).decks).toHaveLength(1);
    expect((await search(user.id, "SpAnIsH")).decks).toHaveLength(1);
  });

  it("scopes results to the calling user", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    await seedDeck(db, u1.id, { name: "U1 Secret", description: null });
    await seedDeck(db, u2.id, { name: "U2 Public", description: null });
    const r1 = await search(u1.id, "secret");
    const r2 = await search(u2.id, "public");
    expect(r1.decks.map((d) => d.name)).toEqual(["U1 Secret"]);
    expect(r2.decks.map((d) => d.name)).toEqual(["U2 Public"]);
  });

  it("returns empty result when nothing matches", async () => {
    const user = await createTestUser(db);
    await seedDeck(db, user.id, { name: "Spanish", description: null });
    const result = await search(user.id, "quantum");
    expect(result).toEqual({ decks: [], cards: [] });
  });
});
