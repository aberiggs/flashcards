import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import {
  computeNextReview,
  qualityFromConfidence,
  type ConfidenceLevel,
} from "./sm2";

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

// Internal version for use within actions (no auth check needed as called from authenticated context)
export const getByDeckInternal = internalQuery({
  args: { deckId: v.id("decks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .collect();
  },
});

// Get cards due for review in a deck (no nextReview or nextReview <= now)
export const getDueByDeck = query({
  args: { deckId: v.id("decks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId) return [];

    const now = Date.now();
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .collect();

    const dueCards = cards.filter(
      (card) => !card.nextReview || card.nextReview <= now
    );

    // Sort: most overdue first (ascending nextReview), then new cards (no nextReview)
    dueCards.sort((a, b) => {
      if (!a.nextReview && !b.nextReview) return 0;
      if (!a.nextReview) return 1; // new cards after overdue
      if (!b.nextReview) return -1;
      return a.nextReview - b.nextReview;
    });

    return dueCards;
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

// Record a review (SM-2 spaced repetition)
export const recordReview = mutation({
  args: {
    id: v.id("cards"),
    confidence: v.union(
      v.literal("wrong"),
      v.literal("close"),
      v.literal("hard"),
      v.literal("easy")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.id);
    if (!card) throw new Error("Card not found");

    const deck = await ctx.db.get(card.deckId);
    if (!deck || deck.userId !== userId) throw new Error("Card not found");

    const efactor = card.efactor ?? 2.5;
    const repetitions = card.repetitions ?? 0;
    const quality = qualityFromConfidence(args.confidence as ConfidenceLevel);

    const result = computeNextReview({
      efactor,
      repetitions,
      quality,
    });

    const now = Date.now();
    await ctx.db.patch(args.id, {
      efactor: result.efactor,
      repetitions: result.repetitions,
      nextReview: result.nextReview,
      lastStudied: now,
      updatedAt: now,
    });

    await ctx.db.patch(card.deckId, { updatedAt: now });
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
