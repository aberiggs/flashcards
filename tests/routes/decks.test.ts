import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import {
  createTestUser,
  seedDeck,
  seedCard,
} from "../setup/db-helpers";
import { mockAuth, setAuthUserId } from "../setup/route-helpers";

// mockAuth() must be called at module scope so vi.mock hoists before the
// route handler modules are imported.
mockAuth();

// Import route handlers AFTER mocking @/server/auth so they pick up the stub.
import { GET as listDecks, POST as createDeck } from "@/app/api/decks/route";
import {
  GET as getDeck,
  PATCH as patchDeck,
  DELETE as deleteDeck,
} from "@/app/api/decks/[id]/route";

function jsonReq(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/api/decks", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/decks", () => {
  beforeEach(() => {
    setAuthUserId(null);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await listDecks();
    expect(res.status).toBe(401);
  });

  it("returns the authenticated user's decks", async () => {
    const user = await createTestUser(db);
    await seedDeck(db, user.id, { name: "Alpha" });
    await seedDeck(db, user.id, { name: "Beta" });
    setAuthUserId(user.id);
    const res = await listDecks();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((d: { name: string }) => d.name)).toEqual(["Alpha", "Beta"]);
  });
});

describe("POST /api/decks", () => {
  beforeEach(() => {
    setAuthUserId(null);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await createDeck(jsonReq({ name: "X" }));
    expect(res.status).toBe(401);
  });

  it("creates a deck and returns 201 with the id", async () => {
    const user = await createTestUser(db);
    setAuthUserId(user.id);
    const res = await createDeck(jsonReq({ name: "New Deck", description: "d" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(typeof body.id).toBe("number");
  });

  it("returns 400 when the name is empty", async () => {
    const user = await createTestUser(db);
    setAuthUserId(user.id);
    const res = await createDeck(jsonReq({ name: "   " }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/cannot be empty/i);
  });
});

describe("GET /api/decks/:id", () => {
  beforeEach(() => {
    setAuthUserId(null);
  });

  function reqFor(id: number | string): Request {
    return new Request(`http://localhost/api/decks/${id}`, { method: "GET" });
  }

  it("returns 401 when not authenticated", async () => {
    const res = await getDeck(reqFor(1), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid id", async () => {
    const user = await createTestUser(db);
    setAuthUserId(user.id);
    const res = await getDeck(reqFor("abc"), { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when the deck does not exist", async () => {
    const user = await createTestUser(db);
    setAuthUserId(user.id);
    const res = await getDeck(reqFor(9999), { params: Promise.resolve({ id: "9999" }) });
    expect(res.status).toBe(404);
  });

  it("returns the deck with its cards", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id, { name: "With Cards" });
    await seedCard(db, deck.id, { front: "q", back: "a" });
    setAuthUserId(user.id);
    const res = await getDeck(reqFor(deck.id), {
      params: Promise.resolve({ id: String(deck.id) }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("With Cards");
    expect(body.cards).toHaveLength(1);
  });
});

describe("PATCH /api/decks/:id", () => {
  beforeEach(() => {
    setAuthUserId(null);
  });

  function reqFor(id: number | string, body: unknown): Request {
    return new Request(`http://localhost/api/decks/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("updates a deck and returns 200", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id, { name: "Old" });
    setAuthUserId(user.id);
    const res = await patchDeck(
      reqFor(deck.id, { name: "New" }),
      { params: Promise.resolve({ id: String(deck.id) }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns 404 when the deck belongs to another user", async () => {
    const u1 = await createTestUser(db, { email: "u1@x.com" });
    const u2 = await createTestUser(db, { email: "u2@x.com" });
    const deck = await seedDeck(db, u1.id);
    setAuthUserId(u2.id);
    const res = await patchDeck(
      reqFor(deck.id, { name: "Hijack" }),
      { params: Promise.resolve({ id: String(deck.id) }) }
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/decks/:id", () => {
  beforeEach(() => {
    setAuthUserId(null);
  });

  function reqFor(id: number | string): Request {
    return new Request(`http://localhost/api/decks/${id}`, { method: "DELETE" });
  }

  it("deletes the deck and returns 200", async () => {
    const user = await createTestUser(db);
    const deck = await seedDeck(db, user.id);
    setAuthUserId(user.id);
    const res = await deleteDeck(reqFor(deck.id), {
      params: Promise.resolve({ id: String(deck.id) }),
    });
    expect(res.status).toBe(200);
  });

  it("returns 404 when the deck does not exist", async () => {
    const user = await createTestUser(db);
    setAuthUserId(user.id);
    const res = await deleteDeck(reqFor(9999), {
      params: Promise.resolve({ id: "9999" }),
    });
    expect(res.status).toBe(404);
  });
});