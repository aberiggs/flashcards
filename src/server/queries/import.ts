import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { cards, decks } from "@/db/schema";
import {
  MAX_CARDS_PER_DECK,
  MAX_CARDS_PER_USER,
  MAX_DECKS_PER_USER,
} from "@/lib/limits";

export interface ImportCardInput {
  front: string;
  back: string;
  efactor?: number;
  repetitions?: number;
  nextReview?: number;
  lastStudied?: number;
}

export async function importDeck(
  userId: string,
  name: string,
  description: string | undefined,
  inputCards: ImportCardInput[]
): Promise<number> {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Deck name cannot be empty");

  const [{ deckCount }] = await db
    .select({ deckCount: sql<number>`count(*)::int` })
    .from(decks)
    .where(eq(decks.userId, userId));

  if (deckCount >= MAX_DECKS_PER_USER) {
    throw new Error(
      `You've reached the limit of ${MAX_DECKS_PER_USER} decks. Delete an existing deck to create a new one.`
    );
  }

  if (inputCards.length > MAX_CARDS_PER_DECK) {
    throw new Error(
      `This import contains ${inputCards.length} cards, which exceeds the limit of ${MAX_CARDS_PER_DECK} cards per deck. Split your content across multiple imports.`
    );
  }

  const [{ totalCards }] = await db
    .select({ totalCards: sql<number>`count(*)::int` })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(eq(decks.userId, userId));

  if (totalCards + inputCards.length > MAX_CARDS_PER_USER) {
    const available = MAX_CARDS_PER_USER - totalCards;
    throw new Error(
      `Importing ${inputCards.length} cards would exceed your total limit of ${MAX_CARDS_PER_USER.toLocaleString()} cards. You have room for ${available} more.`
    );
  }

  const now = new Date();
  const [deck] = await db
    .insert(decks)
    .values({
      userId,
      name: trimmedName,
      description: description ?? null,
      updatedAt: now,
    })
    .returning({ id: decks.id });

  const cardRows = inputCards.map((c) => ({
    deckId: deck.id,
    front: c.front,
    back: c.back,
    efactor: c.efactor ?? 2.5,
    repetitions: c.repetitions ?? 0,
    nextReview: c.nextReview != null ? new Date(c.nextReview) : now,
    lastStudied: c.lastStudied != null ? new Date(c.lastStudied) : null,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(cards).values(cardRows);

  return deck.id;
}