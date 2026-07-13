import { and, asc, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { cards, decks } from "@/db/schema";
import {
  computeNextReview,
  qualityFromConfidence,
  type ConfidenceLevel,
} from "@/lib/sm2";
import { MAX_CARDS_PER_DECK, MAX_CARDS_PER_USER } from "@/lib/limits";
import { sql } from "drizzle-orm";

async function deckOwnedBy(
  userId: string,
  deckId: number
): Promise<boolean> {
  const [row] = await db
    .select({ id: decks.id })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .limit(1);
  return !!row;
}

export async function getCardsByDeck(
  userId: string,
  deckId: number
): Promise<(typeof cards.$inferSelect)[]> {
  if (!(await deckOwnedBy(userId, deckId))) return [];
  return db.select().from(cards).where(eq(cards.deckId, deckId)).orderBy(asc(cards.id));
}

export async function getDueCardsByDeck(
  userId: string,
  deckId: number
): Promise<(typeof cards.$inferSelect)[]> {
  if (!(await deckOwnedBy(userId, deckId))) return [];
  // Due = nextReview <= now. The nextReview column is NOT NULL (defaults to
  // now()), so newly-created cards are immediately due.
  // Ordering is intentionally NOT done here — the client's sortDueCards
  // (src/lib/sortDueCards.ts) owns the day-bucket → SRS level → shuffle
  // ordering. Keeping it client-side makes it unit-testable with a seeded
  // random and avoids per-row random() in the DB query.
  return db
    .select()
    .from(cards)
    .where(and(eq(cards.deckId, deckId), lt(cards.nextReview, sql`now()`)));
}

export async function createCard(
  userId: string,
  deckId: number,
  front: string,
  back: string
): Promise<number> {
  if (!(await deckOwnedBy(userId, deckId))) {
    throw new Error("Deck not found");
  }

  const [{ deckCount }] = await db
    .select({ deckCount: sql<number>`count(*)::int` })
    .from(cards)
    .where(eq(cards.deckId, deckId));

  if (deckCount >= MAX_CARDS_PER_DECK) {
    throw new Error(
      `This deck has reached the limit of ${MAX_CARDS_PER_DECK} cards. Split your content across multiple decks for better organization.`
    );
  }

  const [{ totalCount }] = await db
    .select({ totalCount: sql<number>`count(*)::int` })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(eq(decks.userId, userId));

  if (totalCount >= MAX_CARDS_PER_USER) {
    throw new Error(
      `You've reached the limit of ${MAX_CARDS_PER_USER.toLocaleString()} total cards. Remove unused cards to make room.`
    );
  }

  const now = new Date();
  const [card] = await db
    .insert(cards)
    .values({ deckId, front, back, createdAt: now, updatedAt: now })
    .returning({ id: cards.id });

  await db.update(decks).set({ updatedAt: now }).where(eq(decks.id, deckId));

  return card.id;
}

export async function updateCard(
  userId: string,
  cardId: number,
  patch: { front?: string; back?: string }
): Promise<void> {
  const [card] = await db
    .select()
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(and(eq(cards.id, cardId), eq(decks.userId, userId)))
    .limit(1);

  if (!card) throw new Error("Card not found");

  const updates: Partial<typeof cards.$inferInsert> = { updatedAt: new Date() };
  if (patch.front !== undefined) updates.front = patch.front;
  if (patch.back !== undefined) updates.back = patch.back;

  await db.update(cards).set(updates).where(eq(cards.id, cardId));
  await db.update(decks).set({ updatedAt: new Date() }).where(eq(decks.id, card.cards.deckId));
}

export async function recordReview(
  userId: string,
  cardId: number,
  confidence: ConfidenceLevel
): Promise<void> {
  const [row] = await db
    .select()
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(and(eq(cards.id, cardId), eq(decks.userId, userId)))
    .limit(1);

  if (!row) throw new Error("Card not found");
  const card = row.cards;

  const quality = qualityFromConfidence(confidence);
  const result = computeNextReview({
    efactor: card.efactor,
    repetitions: card.repetitions,
    quality,
  });

  const now = new Date();
  await db
    .update(cards)
    .set({
      efactor: result.efactor,
      repetitions: result.repetitions,
      nextReview: new Date(result.nextReview),
      lastStudied: now,
      updatedAt: now,
    })
    .where(eq(cards.id, cardId));

  await db.update(decks).set({ updatedAt: now }).where(eq(decks.id, card.deckId));
}

export async function deleteCard(
  userId: string,
  cardId: number
): Promise<void> {
  const [row] = await db
    .select()
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(and(eq(cards.id, cardId), eq(decks.userId, userId)))
    .limit(1);

  if (!row) throw new Error("Card not found");

  await db.delete(cards).where(eq(cards.id, cardId));
  await db
    .update(decks)
    .set({ updatedAt: new Date() })
    .where(eq(decks.id, row.cards.deckId));
}