import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import {
  createTestUser,
  seedDeck,
  seedCard,
} from "../setup/db-helpers";
import { mockAuth, setAuthUserId } from "../setup/route-helpers";

mockAuth();

import { GET as listCards, POST as createCard } from "@/app/api/decks/[id]/cards/route";
import { PATCH as patchCard, DELETE as deleteCard } from "@/app/api/decks/[id]/cards/[cardId]/route";
import { POST as startStudy, PATCH as completeStudy } from "@/app/api/decks/[id]/study/route";
import { completeSession, startSession } from "@/server/queries/sessions";

function req(url: string, init: RequestInit = {}): Request {
  return new Request(url, {
    headers: { "content-type": "application/json", ...init.headers },
    ...init,
  });
}

describe("GET /api/decks/:id/cards", () => {
  beforeEach(() => setAuthUserId(null));

  it("returns 401 when not authenticated", async () => {
    const res = await listCards(req("http://localhost/api/decks/1/cards"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns the deck's cards", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    await seedCard(db, deck.id, { front: "q1", back: "a1" });
    await seedCard(db, deck.id, { front: "q2", back: "a2" });
    setAuthUserId(user.id);
    const res = await listCards(
      req(`http://localhost/api/decks/${deck.id}/cards`),
      { params: Promise.resolve({ id: String(deck.id) }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it("returns only due cards when ?due=true", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    await seedCard(db, deck.id, {
      front: "due",
      nextReview: new Date(Date.now() - 1000),
    });
    await seedCard(db, deck.id, {
      front: "future",
      nextReview: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    setAuthUserId(user.id);
    const res = await listCards(
      req(`http://localhost/api/decks/${deck.id}/cards?due=true`),
      { params: Promise.resolve({ id: String(deck.id) }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((c: { front: string }) => c.front)).toEqual(["due"]);
  });

  it("returns 400 for an invalid id", async () => {
    const user = await createTestUser(db);
    setAuthUserId(user.id);
    const res = await listCards(req("http://localhost/api/decks/abc/cards"), {
      params: Promise.resolve({ id: "abc" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/decks/:id/cards", () => {
  beforeEach(() => setAuthUserId(null));

  it("creates a card and returns 201", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    setAuthUserId(user.id);
    const res = await createCard(
      req(`http://localhost/api/decks/${deck.id}/cards`, {
        method: "POST",
        body: JSON.stringify({ front: "q", back: "a" }),
      }),
      { params: Promise.resolve({ id: String(deck.id) }) }
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(typeof body.id).toBe("number");
  });

  it("returns 404 when the deck belongs to another user", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const deck = await seedDeck(db, u1.id);
    setAuthUserId(u2.id);
    const res = await createCard(
      req(`http://localhost/api/decks/${deck.id}/cards`, {
        method: "POST",
        body: JSON.stringify({ front: "q", back: "a" }),
      }),
      { params: Promise.resolve({ id: String(deck.id) }) }
    );
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/decks/:id/cards/:cardId", () => {
  beforeEach(() => setAuthUserId(null));

  it("updates a card's front/back", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const card = await seedCard(db, deck.id, { front: "old", back: "old" });
    setAuthUserId(user.id);
    const res = await patchCard(
      req(`http://localhost/api/decks/${deck.id}/cards/${card.id}`, {
        method: "PATCH",
        body: JSON.stringify({ front: "new", back: "new" }),
      }),
      { params: Promise.resolve({ id: String(deck.id), cardId: String(card.id) }) }
    );
    expect(res.status).toBe(200);
  });

  it("records a review when confidence is provided", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const card = await seedCard(db, deck.id, { repetitions: 0, efactor: 2.5 });
    setAuthUserId(user.id);
    const res = await patchCard(
      req(`http://localhost/api/decks/${deck.id}/cards/${card.id}`, {
        method: "PATCH",
        body: JSON.stringify({ confidence: "easy" }),
      }),
      { params: Promise.resolve({ id: String(deck.id), cardId: String(card.id) }) }
    );
    expect(res.status).toBe(200);
    // The recordReview path should have bumped repetitions to 1.
    const { eq } = await import("drizzle-orm");
    const { cards } = await import("@/db/schema");
    const [row] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, card.id));
    expect(row?.repetitions).toBe(1);
  });

  it("returns 404 when the card does not exist", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    setAuthUserId(user.id);
    const res = await patchCard(
      req(`http://localhost/api/decks/${deck.id}/cards/9999`, {
        method: "PATCH",
        body: JSON.stringify({ front: "x" }),
      }),
      { params: Promise.resolve({ id: String(deck.id), cardId: "9999" }) }
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/decks/:id/cards/:cardId", () => {
  beforeEach(() => setAuthUserId(null));

  it("deletes the card", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const card = await seedCard(db, deck.id);
    setAuthUserId(user.id);
    const res = await deleteCard(
      req(`http://localhost/api/decks/${deck.id}/cards/${card.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: String(deck.id), cardId: String(card.id) }) }
    );
    expect(res.status).toBe(200);
  });
});

describe("POST /api/decks/:id/study", () => {
  beforeEach(() => setAuthUserId(null));

  it("starts a session and returns 201 with the id", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    setAuthUserId(user.id);
    const res = await startStudy(
      req(`http://localhost/api/decks/${deck.id}/study`, { method: "POST" }),
      { params: Promise.resolve({ id: String(deck.id) }) }
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(typeof body.id).toBe("number");
  });

  it("returns 404 when the deck does not exist", async () => {
    const user = await createTestUser(db);
    setAuthUserId(user.id);
    const res = await startStudy(
      req("http://localhost/api/decks/9999/study", { method: "POST" }),
      { params: Promise.resolve({ id: "9999" }) }
    );
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/decks/:id/study", () => {
  beforeEach(() => setAuthUserId(null));

  it("completes the session and returns 200", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    const sessionId = await startSession(user.id, deck.id);
    setAuthUserId(user.id);
    const res = await completeStudy(
      req(`http://localhost/api/decks/${deck.id}/study`, {
        method: "PATCH",
        body: JSON.stringify({
          sessionId,
          cardsStudied: 5,
          cardsCorrect: 3,
          cardsIncorrect: 2,
        }),
      }),
      { params: Promise.resolve({ id: String(deck.id) }) }
    );
    expect(res.status).toBe(200);
  });

  it("returns 400 when sessionId is missing", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    setAuthUserId(user.id);
    const res = await completeStudy(
      req(`http://localhost/api/decks/${deck.id}/study`, {
        method: "PATCH",
        body: JSON.stringify({ cardsStudied: 1, cardsCorrect: 1, cardsIncorrect: 0 }),
      }),
      { params: Promise.resolve({ id: String(deck.id) }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when the session belongs to another user", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const deck = await seedDeck(db, u1.id);
    const sessionId = await startSession(u1.id, deck.id);
    setAuthUserId(u2.id);
    const res = await completeStudy(
      req(`http://localhost/api/decks/${deck.id}/study`, {
        method: "PATCH",
        body: JSON.stringify({
          sessionId,
          cardsStudied: 1,
          cardsCorrect: 1,
          cardsIncorrect: 0,
        }),
      }),
      { params: Promise.resolve({ id: String(deck.id) }) }
    );
    expect(res.status).toBe(404);
  });
});