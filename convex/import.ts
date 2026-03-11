import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "./_generated/server";
import { v } from "convex/values";

const MAX_DECKS_PER_USER = 50;
const MAX_CARDS_PER_DECK = 500;
const MAX_CARDS_PER_USER = 5_000;

export const importDeck = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    cards: v.array(
      v.object({
        front: v.string(),
        back: v.string(),
        efactor: v.optional(v.number()),
        repetitions: v.optional(v.number()),
        nextReview: v.optional(v.number()),
        lastStudied: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const trimmedName = args.name.trim();
    if (!trimmedName) throw new Error("Deck name cannot be empty");

    // Enforce deck cap
    const existingDecks = await ctx.db
      .query("decks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingDecks.length >= MAX_DECKS_PER_USER) {
      throw new Error(
        `You've reached the limit of ${MAX_DECKS_PER_USER} decks. Delete an existing deck to create a new one.`
      );
    }

    // Enforce per-deck card cap
    if (args.cards.length > MAX_CARDS_PER_DECK) {
      throw new Error(
        `This import contains ${args.cards.length} cards, which exceeds the limit of ${MAX_CARDS_PER_DECK} cards per deck. Split your content across multiple imports.`
      );
    }

    // Enforce total user card cap
    let totalCards = 0;
    for (const deck of existingDecks) {
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_deck", (q) => q.eq("deckId", deck._id))
        .collect();
      totalCards += cards.length;
      if (totalCards >= MAX_CARDS_PER_USER) break;
    }

    if (totalCards + args.cards.length > MAX_CARDS_PER_USER) {
      const available = MAX_CARDS_PER_USER - totalCards;
      throw new Error(
        `Importing ${args.cards.length} cards would exceed your total limit of ${MAX_CARDS_PER_USER.toLocaleString()} cards. You have room for ${available} more.`
      );
    }

    // Create the deck
    const now = Date.now();
    const deckId = await ctx.db.insert("decks", {
      name: trimmedName,
      description: args.description,
      userId,
      updatedAt: now,
    });

    // Bulk-insert cards
    for (const card of args.cards) {
      await ctx.db.insert("cards", {
        deckId,
        front: card.front,
        back: card.back,
        efactor: card.efactor,
        repetitions: card.repetitions,
        nextReview: card.nextReview,
        lastStudied: card.lastStudied,
        updatedAt: now,
      });
    }

    return deckId;
  },
});
