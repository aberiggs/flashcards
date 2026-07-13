import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users, decks, cards, studySessions } from "@/db/schema";
import type { Db } from "./types";

/**
 * Truncate every app table. Order-insensitive thanks to TRUNCATE CASCADE.
 * Restarts identity sequences so generated IDs are deterministic per test.
 */
export async function resetDb(db: Db): Promise<void> {
  await db.execute(
    sql`TRUNCATE TABLE users, decks, cards, study_sessions RESTART IDENTITY CASCADE`
  );
}

export interface TestUser {
  id: string;
  email: string;
  name: string;
}

/** Insert a user row with a placeholder password hash. Returns the row. */
export async function createTestUser(
  db: Db,
  overrides: Partial<TestUser> = {}
): Promise<TestUser> {
  const id = overrides.id ?? crypto.randomUUID();
  const email = overrides.email ?? `test-${id}@example.com`;
  const name = overrides.name ?? "Test User";
  await db.insert(users).values({
    id,
    email,
    name,
    passwordHash: "$2a$12$placeholderplaceholderplaceholderplaceholderplaceholder",
  });
  return { id, email, name };
}

export interface SeedDeckInput {
  name?: string;
  description?: string | null;
  updatedAt?: Date;
}

export async function seedDeck(
  db: Db,
  userId: string,
  input: SeedDeckInput = {}
): Promise<{ id: number; name: string }> {
  const [deck] = await db
    .insert(decks)
    .values({
      userId,
      name: input.name ?? "Test Deck",
      description: input.description ?? null,
      updatedAt: input.updatedAt ?? new Date(),
    })
    .returning({ id: decks.id, name: decks.name });
  return deck;
}

export interface SeedCardInput {
  front?: string;
  back?: string;
  efactor?: number;
  repetitions?: number;
  nextReview?: Date;
  lastStudied?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function seedCard(
  db: Db,
  deckId: number,
  input: SeedCardInput = {}
): Promise<{ id: number }> {
  const now = input.createdAt ?? new Date();
  const [card] = await db
    .insert(cards)
    .values({
      deckId,
      front: input.front ?? "Front",
      back: input.back ?? "Back",
      efactor: input.efactor ?? 2.5,
      repetitions: input.repetitions ?? 0,
      nextReview: input.nextReview ?? now,
      lastStudied: input.lastStudied ?? null,
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    })
    .returning({ id: cards.id });
  return card;
}

export interface SeedSessionInput {
  deckId: number;
  startedAt?: Date;
  completedAt?: Date | null;
  cardsStudied?: number;
  cardsCorrect?: number;
  cardsIncorrect?: number;
}

export async function seedSession(
  db: Db,
  userId: string,
  input: SeedSessionInput
): Promise<{ id: number }> {
  const [session] = await db
    .insert(studySessions)
    .values({
      userId,
      deckId: input.deckId,
      startedAt: input.startedAt ?? new Date(),
      completedAt: input.completedAt === undefined ? null : input.completedAt,
      cardsStudied: input.cardsStudied ?? 0,
      cardsCorrect: input.cardsCorrect ?? 0,
      cardsIncorrect: input.cardsIncorrect ?? 0,
    })
    .returning({ id: studySessions.id });
  return session;
}
