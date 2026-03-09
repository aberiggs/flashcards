import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { v } from "convex/values";

const MAX_DECK_RESULTS = 10;
const MAX_CARD_RESULTS = 20;

function matchesQuery(text: string, q: string): boolean {
  return text.toLowerCase().includes(q);
}

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { decks: [], cards: [] };

    const trimmed = args.query.trim().toLowerCase();
    if (trimmed.length < 2) return { decks: [], cards: [] };

    // Fetch all user's decks
    const allDecks = await ctx.db
      .query("decks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Match decks on name or description
    const matchedDecks = allDecks
      .filter(
        (d) =>
          matchesQuery(d.name, trimmed) ||
          (d.description && matchesQuery(d.description, trimmed))
      )
      .slice(0, MAX_DECK_RESULTS);

    // Build deck id → name + card count map from all decks (needed for card results)
    const deckMap = new Map(
      allDecks.map((d) => [d._id, { name: d.name }])
    );

    // Fetch cards for each deck and filter, stopping once we have enough
    const matchedCards: Array<{
      _id: string;
      front: string;
      back: string;
      deckId: string;
      deckName: string;
    }> = [];

    for (const deck of allDecks) {
      if (matchedCards.length >= MAX_CARD_RESULTS) break;

      const cards = await ctx.db
        .query("cards")
        .withIndex("by_deck", (q) => q.eq("deckId", deck._id))
        .collect();

      for (const card of cards) {
        if (matchedCards.length >= MAX_CARD_RESULTS) break;
        if (matchesQuery(card.front, trimmed) || matchesQuery(card.back, trimmed)) {
          matchedCards.push({
            _id: card._id,
            front: card.front,
            back: card.back,
            deckId: deck._id,
            deckName: deckMap.get(deck._id)?.name ?? "",
          });
        }
      }
    }

    // Get card counts for matched decks
    const decksWithCount = await Promise.all(
      matchedDecks.map(async (deck) => {
        const cards = await ctx.db
          .query("cards")
          .withIndex("by_deck", (q) => q.eq("deckId", deck._id))
          .collect();
        return {
          _id: deck._id,
          name: deck.name,
          description: deck.description,
          cardCount: cards.length,
        };
      })
    );

    return { decks: decksWithCount, cards: matchedCards };
  },
});
