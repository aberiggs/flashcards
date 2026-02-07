import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all cards for a deck
export const getByDeck = query({
  args: { deckId: v.id("decks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Verify the user owns this deck
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId) return [];

    return await ctx.db
      .query("cards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .collect();
  },
});

// Get a single card
export const get = query({
  args: { id: v.id("cards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const card = await ctx.db.get(args.id);
    if (!card) return null;

    // Verify ownership through the deck
    const deck = await ctx.db.get(card.deckId);
    if (!deck || deck.userId !== userId) return null;

    return card;
  },
});

// Create a new card
export const create = mutation({
  args: {
    deckId: v.id("decks"),
    front: v.string(),
    back: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId) throw new Error("Deck not found");

    // Update deck's updatedAt
    await ctx.db.patch(args.deckId, { updatedAt: Date.now() });

    return await ctx.db.insert("cards", {
      deckId: args.deckId,
      front: args.front,
      back: args.back,
    });
  },
});

// Update a card
export const update = mutation({
  args: {
    id: v.id("cards"),
    front: v.optional(v.string()),
    back: v.optional(v.string()),
    lastStudied: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.id);
    if (!card) throw new Error("Card not found");

    const deck = await ctx.db.get(card.deckId);
    if (!deck || deck.userId !== userId) throw new Error("Card not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.front !== undefined) updates.front = args.front;
    if (args.back !== undefined) updates.back = args.back;
    if (args.lastStudied !== undefined) updates.lastStudied = args.lastStudied;

    await ctx.db.patch(args.id, updates);

    // Update deck's updatedAt
    await ctx.db.patch(card.deckId, { updatedAt: Date.now() });
  },
});

// Delete a card
export const remove = mutation({
  args: { id: v.id("cards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.id);
    if (!card) throw new Error("Card not found");

    const deck = await ctx.db.get(card.deckId);
    if (!deck || deck.userId !== userId) throw new Error("Card not found");

    await ctx.db.delete(args.id);

    // Update deck's updatedAt
    await ctx.db.patch(card.deckId, { updatedAt: Date.now() });
  },
});
