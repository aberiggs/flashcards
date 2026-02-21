import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const startSession = mutation({
  args: { deckId: v.id("decks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId) throw new Error("Deck not found");

    return await ctx.db.insert("studySessions", {
      userId,
      deckId: args.deckId,
      startedAt: Date.now(),
      cardsStudied: 0,
      cardsCorrect: 0,
      cardsIncorrect: 0,
    });
  },
});

export const completeSession = mutation({
  args: {
    sessionId: v.id("studySessions"),
    cardsStudied: v.number(),
    cardsCorrect: v.number(),
    cardsIncorrect: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId)
      throw new Error("Session not found");

    await ctx.db.patch(args.sessionId, {
      completedAt: Date.now(),
      cardsStudied: args.cardsStudied,
      cardsCorrect: args.cardsCorrect,
      cardsIncorrect: args.cardsIncorrect,
    });
  },
});

export const recordEvent = mutation({
  args: {
    sessionId: v.id("studySessions"),
    cardId: v.id("cards"),
    deckId: v.id("decks"),
    quality: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.insert("studyEvents", {
      userId,
      sessionId: args.sessionId,
      cardId: args.cardId,
      deckId: args.deckId,
      quality: args.quality,
      timestamp: Date.now(),
    });
  },
});
