import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import {
  createTestUser,
  seedDeck,
  seedCard,
  seedSession,
} from "../setup/db-helpers";
import { mockAuth, setAuthUserId } from "../setup/route-helpers";

mockAuth();

import { GET as searchRoute } from "@/app/api/search/route";
import { POST as importRoute } from "@/app/api/import/route";
import { GET as dashboardRoute } from "@/app/api/stats/dashboard/route";
import { GET as intervalsRoute } from "@/app/api/stats/intervals/route";
import { GET as deckIntervalsRoute } from "@/app/api/decks/[id]/intervals/route";
import { GET as activityRoute } from "@/app/api/stats/activity/route";

function req(url: string, init: RequestInit = {}): Request {
  return new Request(url, {
    headers: { "content-type": "application/json", ...init.headers },
    ...init,
  });
}

describe("GET /api/search", () => {
  beforeEach(() => setAuthUserId(null));

  it("returns 401 when not authenticated", async () => {
    const res = await searchRoute(req("http://localhost/api/search?q=hello"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when the query is shorter than 2 chars", async () => {
    const user = await createTestUser(db);
    setAuthUserId(user.id);
    const res = await searchRoute(req("http://localhost/api/search?q=a"));
    expect(res.status).toBe(400);
  });

  it("returns matching decks and cards", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id, { name: "Spanish" });
    await seedCard(db, deck.id, { front: "hola", back: "hello" });
    setAuthUserId(user.id);
    const res = await searchRoute(req("http://localhost/api/search?q=spanish"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decks.map((d: { name: string }) => d.name)).toEqual(["Spanish"]);
  });

  it("scopes results to the calling user", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    await seedDeck(db, u1.id, { name: "U1 Secret" });
    await seedDeck(db, u2.id, { name: "U2 Public" });
    setAuthUserId(u1.id);
    const res = await searchRoute(req("http://localhost/api/search?q=secret"));
    const body = await res.json();
    expect(body.decks.map((d: { name: string }) => d.name)).toEqual(["U1 Secret"]);
  });
});

describe("POST /api/import", () => {
  beforeEach(() => setAuthUserId(null));

  it("returns 401 when not authenticated", async () => {
    const res = await importRoute(
      req("http://localhost/api/import", {
        method: "POST",
        body: JSON.stringify({ name: "X", cards: [] }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("imports a deck and returns 201 with the id", async () => {
    const user = await createTestUser(db);
    setAuthUserId(user.id);
    const res = await importRoute(
      req("http://localhost/api/import", {
        method: "POST",
        body: JSON.stringify({
          name: "Imported",
          cards: [
            { front: "hola", back: "hello" },
            { front: "adios", back: "goodbye" },
          ],
        }),
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(typeof body.id).toBe("number");
  });

  it("returns 400 when the name is empty", async () => {
    const user = await createTestUser(db);
    setAuthUserId(user.id);
    const res = await importRoute(
      req("http://localhost/api/import", {
        method: "POST",
        body: JSON.stringify({ name: "   ", cards: [{ front: "a", back: "b" }] }),
      })
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/stats/dashboard", () => {
  beforeEach(() => setAuthUserId(null));

  it("returns 401 when not authenticated", async () => {
    const res = await dashboardRoute(req("http://localhost/api/stats/dashboard"));
    expect(res.status).toBe(401);
  });

  it("returns memory stages and review forecast", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    await seedCard(db, deck.id, { repetitions: 0 });
    setAuthUserId(user.id);
    const res = await dashboardRoute(req("http://localhost/api/stats/dashboard?tz=UTC"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.memoryStages).toBeDefined();
    expect(Array.isArray(body.reviewForecast)).toBe(true);
    expect(body.reviewForecast).toHaveLength(30);
    expect(body.reviewForecast[0].bucket).toBe("day");
    expect(body.memoryStages.seed).toBe(1);
  });

  it("accepts ?horizon=24h and returns 24 hour-buckets", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    await seedCard(db, deck.id, { repetitions: 0 });
    setAuthUserId(user.id);
    const res = await dashboardRoute(
      req("http://localhost/api/stats/dashboard?tz=UTC&horizon=24h")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reviewForecast).toHaveLength(24);
    expect(body.reviewForecast.every((b: { bucket: string }) => b.bucket === "hour")).toBe(true);
  });

  it("treats an unknown horizon as 30d", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    await seedCard(db, deck.id, { repetitions: 0 });
    setAuthUserId(user.id);
    const res = await dashboardRoute(
      req("http://localhost/api/stats/dashboard?tz=UTC&horizon=bogus")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reviewForecast).toHaveLength(30);
    expect(body.reviewForecast[0].bucket).toBe("day");
  });
});

describe("GET /api/stats/intervals", () => {
  beforeEach(() => setAuthUserId(null));

  it("returns 401 when not authenticated", async () => {
    const res = await intervalsRoute(req("http://localhost/api/stats/intervals"));
    expect(res.status).toBe(401);
  });

  it("returns zeroed stats for a user with no sessions", async () => {
    const user = await createTestUser(db);
    setAuthUserId(user.id);
    const res = await intervalsRoute(req("http://localhost/api/stats/intervals?tz=UTC"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body["1w"].sessions).toBe(0);
    expect(body["1w"].cardsReviewed).toBe(0);
    expect(body["1w"].accuracyRate).toBeNull();
    expect(body["1w"].cardsDeltaPct).toBeNull();
    expect(body["1m"]).toBeDefined();
    expect(body["1y"]).toBeDefined();
  });

  it("aggregates 1w stats from completed sessions", async () => {
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
    setAuthUserId(user.id);
    const res = await intervalsRoute(req("http://localhost/api/stats/intervals?tz=UTC"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body["1w"].sessions).toBe(1);
    expect(body["1w"].cardsReviewed).toBe(5);
    expect(body["1w"].accuracyRate).toBe(80);
  });
});

describe("GET /api/decks/:id/intervals", () => {
  beforeEach(() => setAuthUserId(null));

  it("returns 401 when not authenticated", async () => {
    const res = await deckIntervalsRoute(
      req("http://localhost/api/decks/1/intervals"),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for a non-numeric deck id", async () => {
    const user = await createTestUser(db);
    setAuthUserId(user.id);
    const res = await deckIntervalsRoute(
      req("http://localhost/api/decks/abc/intervals?tz=UTC"),
      { params: Promise.resolve({ id: "abc" }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when the deck is not owned", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const deck = await seedDeck(db, u1.id);
    setAuthUserId(u2.id);
    const res = await deckIntervalsRoute(
      req(`http://localhost/api/decks/${deck.id}/intervals?tz=UTC`),
      { params: Promise.resolve({ id: String(deck.id) }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns interval stats scoped to the deck", async () => {
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
    setAuthUserId(user.id);
    const res = await deckIntervalsRoute(
      req(`http://localhost/api/decks/${d1.id}/intervals?tz=UTC`),
      { params: Promise.resolve({ id: String(d1.id) }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body["1w"].cardsReviewed).toBe(4);
    expect(body["1w"].accuracyRate).toBe(100);
  });
});

describe("GET /api/stats/activity", () => {
  beforeEach(() => setAuthUserId(null));

  it("returns 401 when not authenticated", async () => {
    const res = await activityRoute(req("http://localhost/api/stats/activity"));
    expect(res.status).toBe(401);
  });

  it("returns an empty object for a user with no sessions", async () => {
    const user = await createTestUser(db);
    setAuthUserId(user.id);
    const res = await activityRoute(req("http://localhost/api/stats/activity?tz=UTC"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({});
  });
});
