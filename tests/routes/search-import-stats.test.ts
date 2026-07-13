import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import {
  createTestUser,
  seedDeck,
  seedCard,
} from "../setup/db-helpers";
import { mockAuth, setAuthUserId } from "../setup/route-helpers";

mockAuth();

import { GET as searchRoute } from "@/app/api/search/route";
import { POST as importRoute } from "@/app/api/import/route";
import { GET as dashboardRoute } from "@/app/api/stats/dashboard/route";
import { GET as gamificationRoute } from "@/app/api/stats/gamification/route";
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
    expect(body.reviewForecast).toBeDefined();
    expect(body.memoryStages.new).toBe(1);
  });
});

describe("GET /api/stats/gamification", () => {
  beforeEach(() => setAuthUserId(null));

  it("returns 401 when not authenticated", async () => {
    const res = await gamificationRoute(req("http://localhost/api/stats/gamification"));
    expect(res.status).toBe(401);
  });

  it("returns zeroes for a user with no sessions", async () => {
    const user = await createTestUser(db);
    setAuthUserId(user.id);
    const res = await gamificationRoute(req("http://localhost/api/stats/gamification?tz=UTC"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.streak).toBe(0);
    expect(body.accuracyRate).toBeNull();
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