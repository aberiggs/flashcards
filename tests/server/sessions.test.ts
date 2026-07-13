import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { studySessions } from "@/db/schema";
import { startSession, completeSession } from "@/server/queries/sessions";
import { createTestUser, seedDeck } from "../setup/db-helpers";

describe("startSession", () => {
  it("creates a session and returns its id", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const id = await startSession(user.id, deck.id);
    expect(typeof id).toBe("number");
    expect(id).toBeGreaterThan(0);

    const [row] = await db
      .select()
      .from(studySessions)
      .where(eq(studySessions.id, id));
    expect(row?.userId).toBe(user.id);
    expect(row?.deckId).toBe(deck.id);
    expect(row?.completedAt).toBeNull();
    expect(row?.cardsStudied).toBe(0);
  });

  it("throws when the deck does not exist", async () => {
    const user = await createTestUser(db);
    await expect(startSession(user.id, 99999)).rejects.toThrow(/not found/i);
  });

  it("throws when the deck belongs to another user", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const deck = await seedDeck(db, u1.id);
    await expect(startSession(u2.id, deck.id)).rejects.toThrow(/not found/i);
  });
});

describe("completeSession", () => {
  it("records counts and sets completedAt", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const id = await startSession(user.id, deck.id);
    await completeSession(user.id, id, {
      cardsStudied: 10,
      cardsCorrect: 7,
      cardsIncorrect: 3,
    });
    const [row] = await db
      .select()
      .from(studySessions)
      .where(eq(studySessions.id, id));
    expect(row?.completedAt).not.toBeNull();
    expect(row?.cardsStudied).toBe(10);
    expect(row?.cardsCorrect).toBe(7);
    expect(row?.cardsIncorrect).toBe(3);
  });

  it("throws when the session does not exist", async () => {
    const user = await createTestUser(db);
    await expect(
      completeSession(user.id, 99999, {
        cardsStudied: 1,
        cardsCorrect: 1,
        cardsIncorrect: 0,
      })
    ).rejects.toThrow(/not found/i);
  });

  it("throws when the session belongs to another user", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const deck = await seedDeck(db, u1.id);
    const id = await startSession(u1.id, deck.id);
    await expect(
      completeSession(u2.id, id, {
        cardsStudied: 1,
        cardsCorrect: 1,
        cardsIncorrect: 0,
      })
    ).rejects.toThrow(/not found/i);
  });
});