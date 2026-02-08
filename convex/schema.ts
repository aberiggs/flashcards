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
});
