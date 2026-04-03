import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import {
  computeNextReview,
  qualityFromConfidence,
  type ConfidenceLevel,
} from "./sm2";
import { MAX_CARDS_PER_DECK, MAX_CARDS_PER_USER } from "./limits";

function normalizeCardSide(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

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

export const reverseGenerationSummary = query({
  args: { deckId: v.id("decks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId) return null;

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .collect();

    const existingPairs = new Set(
      cards.map((card) => `${normalizeCardSide(card.front)}\u0000${normalizeCardSide(card.back)}`)
    );

    const candidates = new Map<string, { front: string; back: string }>();
    let skippedExistingReverseCount = 0;
    let skippedDuplicateCandidateCount = 0;

    for (const card of cards) {
      const reverseFront = card.back.trim();
      const reverseBack = card.front.trim();
      const reverseKey = `${normalizeCardSide(reverseFront)}\u0000${normalizeCardSide(reverseBack)}`;

      if (existingPairs.has(reverseKey)) {
        skippedExistingReverseCount++;
        continue;
      }

      if (candidates.has(reverseKey)) {
        skippedDuplicateCandidateCount++;
        continue;
      }

      candidates.set(reverseKey, {
        front: reverseFront,
        back: reverseBack,
      });
    }

    const cardsToCreateCount = candidates.size;
    const remainingDeckCapacity = Math.max(0, MAX_CARDS_PER_DECK - cards.length);
    const deckLimitExceeded = cardsToCreateCount > remainingDeckCapacity;

    const decks = await ctx.db
      .query("decks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    let totalCards = 0;
    for (const userDeck of decks) {
      const count = await ctx.db
        .query("cards")
        .withIndex("by_deck", (q) => q.eq("deckId", userDeck._id))
        .collect()
        .then((c) => c.length);
      totalCards += count;
      if (totalCards >= MAX_CARDS_PER_USER) break;
    }

    const remainingUserCapacity = Math.max(0, MAX_CARDS_PER_USER - totalCards);
    const userLimitExceeded = cardsToCreateCount > remainingUserCapacity;

    return {
      totalCardsInDeck: cards.length,
      cardsToCreateCount,
      skippedExistingReverseCount,
      skippedDuplicateCandidateCount,
      remainingDeckCapacity,
      remainingUserCapacity,
      deckLimitExceeded,
      userLimitExceeded,
    };
  },
});

export const generateReverseCards = mutation({
  args: { deckId: v.id("decks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId) throw new Error("Deck not found");

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .collect();

    const existingPairs = new Set(
      cards.map((card) => `${normalizeCardSide(card.front)}\u0000${normalizeCardSide(card.back)}`)
    );

    const candidates = new Map<string, { front: string; back: string }>();
    let skippedExistingReverseCount = 0;
    let skippedDuplicateCandidateCount = 0;

    for (const card of cards) {
      const reverseFront = card.back.trim();
      const reverseBack = card.front.trim();
      const reverseKey = `${normalizeCardSide(reverseFront)}\u0000${normalizeCardSide(reverseBack)}`;

      if (existingPairs.has(reverseKey)) {
        skippedExistingReverseCount++;
        continue;
      }

      if (candidates.has(reverseKey)) {
        skippedDuplicateCandidateCount++;
        continue;
      }

      candidates.set(reverseKey, {
        front: reverseFront,
        back: reverseBack,
      });
    }

    const cardsToCreate = Array.from(candidates.values());
    const remainingDeckCapacity = MAX_CARDS_PER_DECK - cards.length;
    if (cardsToCreate.length > remainingDeckCapacity) {
      throw new Error(
        `Generating ${cardsToCreate.length} reverse cards would exceed this deck's limit of ${MAX_CARDS_PER_DECK}. Only ${Math.max(0, remainingDeckCapacity)} more card${remainingDeckCapacity === 1 ? "" : "s"} can be added.`
      );
    }

    const decks = await ctx.db
      .query("decks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    let totalCards = 0;
    for (const userDeck of decks) {
      const count = await ctx.db
        .query("cards")
        .withIndex("by_deck", (q) => q.eq("deckId", userDeck._id))
        .collect()
        .then((c) => c.length);
      totalCards += count;
      if (totalCards >= MAX_CARDS_PER_USER) break;
    }

    const remainingUserCapacity = MAX_CARDS_PER_USER - totalCards;
    if (cardsToCreate.length > remainingUserCapacity) {
      throw new Error(
        `Generating ${cardsToCreate.length} reverse cards would exceed your total limit of ${MAX_CARDS_PER_USER.toLocaleString()} cards. Only ${Math.max(0, remainingUserCapacity)} more card${remainingUserCapacity === 1 ? "" : "s"} can be added.`
      );
    }

    if (cardsToCreate.length > 0) {
      const now = Date.now();
      for (const card of cardsToCreate) {
        await ctx.db.insert("cards", {
          deckId: args.deckId,
          front: card.front,
          back: card.back,
          updatedAt: now,
        });
      }
      await ctx.db.patch(args.deckId, { updatedAt: now });
    }

    return {
      createdCount: cardsToCreate.length,
      skippedExistingReverseCount,
      skippedDuplicateCandidateCount,
    };
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

    // Check per-deck cap
    const deckCardCount = await ctx.db
      .query("cards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .collect()
      .then((c) => c.length);

    if (deckCardCount >= MAX_CARDS_PER_DECK) {
      throw new Error(
        `This deck has reached the limit of ${MAX_CARDS_PER_DECK} cards. Split your content across multiple decks for better organization.`
      );
    }

    // Check total user cap
    const decks = await ctx.db
      .query("decks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    let totalCards = 0;
    for (const d of decks) {
      const count = await ctx.db
        .query("cards")
        .withIndex("by_deck", (q) => q.eq("deckId", d._id))
        .collect()
        .then((c) => c.length);
      totalCards += count;
      if (totalCards >= MAX_CARDS_PER_USER) break;
    }

    if (totalCards >= MAX_CARDS_PER_USER) {
      throw new Error(
        `You've reached the limit of ${MAX_CARDS_PER_USER.toLocaleString()} total cards. Remove unused cards to make room.`
      );
    }

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
