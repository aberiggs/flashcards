import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all decks for the authenticated user, with stats
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const decks = await ctx.db
      .query("decks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const now = Date.now();
    const decksWithStats = await Promise.all(
      decks.map(async (deck) => {
        const cards = await ctx.db
          .query("cards")
          .withIndex("by_deck", (q) => q.eq("deckId", deck._id))
          .collect();

        const lastStudied = cards.reduce<number | undefined>(
          (latest, card) => {
            if (card.lastStudied && (!latest || card.lastStudied > latest)) {
              return card.lastStudied;
            }
            return latest;
          },
          undefined,
        );

        const dueCount = cards.filter(
          (card) => !card.nextReview || card.nextReview <= now
        ).length;

        const futureReviews = cards
          .map((c) => c.nextReview)
          .filter((t): t is number => typeof t === "number" && t > now);
        const nextReviewAt =
          futureReviews.length > 0 ? Math.min(...futureReviews) : undefined;

        return {
          ...deck,
          cardCount: cards.length,
          lastStudied,
          dueCount,
          nextReviewAt,
        };
      }),
    );

    return decksWithStats;
  },
});

// Get a single deck by ID
export const get = query({
  args: { id: v.id("decks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const deck = await ctx.db.get(args.id);
    if (!deck || deck.userId !== userId) return null;

    return deck;
  },
});

// Get a deck with all its cards
export const getWithCards = query({
  args: { id: v.id("decks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const deck = await ctx.db.get(args.id);
    if (!deck || deck.userId !== userId) return null;

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_deck", (q) => q.eq("deckId", deck._id))
      .collect();

    return { ...deck, cards };
  },
});

// Create a new deck
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("decks", {
      name: args.name,
      description: args.description,
      userId,
    });
  },
});

// Update a deck
export const update = mutation({
  args: {
    id: v.id("decks"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const deck = await ctx.db.get(args.id);
    if (!deck || deck.userId !== userId) throw new Error("Deck not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.id, updates);
  },
});

// Delete a deck and all its cards
export const remove = mutation({
  args: { id: v.id("decks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const deck = await ctx.db.get(args.id);
    if (!deck || deck.userId !== userId) throw new Error("Deck not found");

    // Delete all cards in this deck
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.id))
      .collect();

    for (const card of cards) {
      await ctx.db.delete(card._id);
    }

    // Delete the deck itself
    await ctx.db.delete(args.id);
  },
});
