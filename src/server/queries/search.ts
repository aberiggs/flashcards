import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { cards, decks } from "@/db/schema";

const MAX_DECK_RESULTS = 10;
const MAX_CARD_RESULTS = 20;

export interface SearchResult {
  decks: {
    id: number;
    name: string;
    description: string | null;
    cardCount: number;
  }[];
  cards: {
    id: number;
    front: string;
    back: string;
    deckId: number;
    deckName: string;
  }[];
}

export async function search(
  userId: string,
  query: string
): Promise<SearchResult> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { decks: [], cards: [] };

  const pattern = `%${trimmed}%`;

  const matchedDecks = await db
    .select({
      id: decks.id,
      name: decks.name,
      description: decks.description,
      // Correlated subquery counting cards for each deck. Written as a fully
      // raw SQL string because interpolating Drizzle column refs (e.g.
      // ${decks.id}) inside sql`...` strips the table qualifier, leaving an
      // ambiguous "id" that Postgres resolves to the inner cards table.
      cardCount: sql<number>`(select count(*) from cards where cards.deck_id = decks.id)::int`,
    })
    .from(decks)
    .where(
      and(
        eq(decks.userId, userId),
        or(ilike(decks.name, pattern), ilike(decks.description, pattern))
      )
    )
    .limit(MAX_DECK_RESULTS);

  const matchedCards = await db
    .select({
      id: cards.id,
      front: cards.front,
      back: cards.back,
      deckId: cards.deckId,
      deckName: decks.name,
    })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(
      and(
        eq(decks.userId, userId),
        or(ilike(cards.front, pattern), ilike(cards.back, pattern))
      )
    )
    .limit(MAX_CARD_RESULTS);

  return { decks: matchedDecks, cards: matchedCards };
}