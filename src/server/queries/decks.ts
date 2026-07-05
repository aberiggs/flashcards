import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { decks, cards } from "@/db/schema";
import { MAX_DECKS_PER_USER } from "@/lib/limits";

export type DeckWithStats = {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  cardCount: number;
  dueCount: number;
  lastStudied: number | null;
  nextReviewAt: number | null;
};

export async function listDecks(userId: string): Promise<DeckWithStats[]> {
  const rows = await db
    .select({
      id: decks.id,
      name: decks.name,
      description: decks.description,
      createdAt: decks.createdAt,
      updatedAt: decks.updatedAt,
      cardCount: sql<number>`count(${cards.id})::int`,
      dueCount:
        sql<number>`sum(case when ${cards.nextReview} <= now() then 1 else 0 end)::int`,
      lastStudied:
        sql<number>`max(extract(epoch from ${cards.lastStudied}) * 1000)::bigint`,
      nextReviewAt:
        sql<number>`min(case when ${cards.nextReview} > now() then extract(epoch from ${cards.nextReview}) * 1000 end)::bigint`,
    })
    .from(decks)
    .leftJoin(cards, eq(cards.deckId, decks.id))
    .where(eq(decks.userId, userId))
    .groupBy(decks.id, decks.name, decks.description, decks.createdAt, decks.updatedAt)
    .orderBy(decks.id);

  return rows.map((r) => ({
    ...r,
    lastStudied: r.lastStudied === null ? null : Number(r.lastStudied),
    nextReviewAt: r.nextReviewAt === null ? null : Number(r.nextReviewAt),
  }));
}

export async function getDeck(
  userId: string,
  deckId: number
): Promise<typeof decks.$inferSelect | null> {
  const [deck] = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .limit(1);
  return deck ?? null;
}

export type DeckWithCards = typeof decks.$inferSelect & {
  cards: (typeof cards.$inferSelect)[];
};

export async function getDeckWithCards(
  userId: string,
  deckId: number
): Promise<DeckWithCards | null> {
  const deck = await getDeck(userId, deckId);
  if (!deck) return null;
  const deckCards = await db
    .select()
    .from(cards)
    .where(eq(cards.deckId, deckId))
    .orderBy(cards.id);
  return { ...deck, cards: deckCards };
}

export async function createDeck(
  userId: string,
  name: string,
  description?: string
): Promise<number> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Deck name cannot be empty");

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(decks)
    .where(eq(decks.userId, userId));

  if (count >= MAX_DECKS_PER_USER) {
    throw new Error(
      `You've reached the limit of ${MAX_DECKS_PER_USER} decks. Delete an existing deck to create a new one.`
    );
  }

  const [deck] = await db
    .insert(decks)
    .values({ userId, name: trimmed, description: description ?? null })
    .returning({ id: decks.id });

  return deck.id;
}

export async function updateDeck(
  userId: string,
  deckId: number,
  patch: { name?: string; description?: string }
): Promise<void> {
  const deck = await getDeck(userId, deckId);
  if (!deck) throw new Error("Deck not found");

  const updates: Partial<typeof decks.$inferInsert> = { updatedAt: new Date() };
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) throw new Error("Deck name cannot be empty");
    updates.name = trimmed;
  }
  if (patch.description !== undefined) {
    updates.description = patch.description || null;
  }

  await db.update(decks).set(updates).where(eq(decks.id, deckId));
}

export async function deleteDeck(
  userId: string,
  deckId: number
): Promise<void> {
  const deck = await getDeck(userId, deckId);
  if (!deck) throw new Error("Deck not found");

  // ON DELETE CASCADE on cards + studySessions handles the children.
  await db.delete(decks).where(eq(decks.id, deckId));
}