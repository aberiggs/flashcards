import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  decks: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    userId: v.id("users"),
    updatedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  cards: defineTable({
    deckId: v.id("decks"),
    front: v.string(),
    back: v.string(),
    updatedAt: v.optional(v.number()),
    lastStudied: v.optional(v.number()),
    efactor: v.optional(v.number()),
    repetitions: v.optional(v.number()),
    nextReview: v.optional(v.number()),
  })
    .index("by_deck", ["deckId"])
    .index("by_deck_next_review", ["deckId", "nextReview"]),

  studySessions: defineTable({
    userId: v.id("users"),
    deckId: v.id("decks"),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    cardsStudied: v.number(),
    cardsCorrect: v.number(),
    cardsIncorrect: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_started", ["userId", "startedAt"]),

  studyEvents: defineTable({
    userId: v.id("users"),
    sessionId: v.id("studySessions"),
    cardId: v.id("cards"),
    deckId: v.id("decks"),
    quality: v.number(),
    timestamp: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_user_timestamp", ["userId", "timestamp"]),

  userSettings: defineTable({
    userId: v.id("users"),
    openAiApiKey: v.optional(v.string()),
  }).index("by_user", ["userId"]),
});
