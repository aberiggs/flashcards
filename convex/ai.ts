import { getAuthUserId } from "@convex-dev/auth/server";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { MAX_CARDS_PER_DECK, MAX_CARDS_PER_USER } from "./limits";

const MAX_CARDS = 50;
const AUTO_MIN_CARDS = 1;
const AUTO_MAX_CARDS = 50;

export const bulkInsertCards = internalMutation({
  args: {
    deckId: v.id("decks"),
    userId: v.id("users"),
    cards: v.array(v.object({ front: v.string(), back: v.string() })),
  },
  handler: async (ctx, args) => {
    // Check per-deck cap
    const existingInDeck = await ctx.db
      .query("cards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .collect()
      .then((c) => c.length);

    if (existingInDeck + args.cards.length > MAX_CARDS_PER_DECK) {
      const available = MAX_CARDS_PER_DECK - existingInDeck;
      if (available <= 0) {
        throw new Error(
          `This deck has reached the limit of ${MAX_CARDS_PER_DECK} cards. Split your content across multiple decks for better organization.`
        );
      }
      throw new Error(
        `Adding ${args.cards.length} cards would exceed this deck's limit of ${MAX_CARDS_PER_DECK}. Only ${available} more card${available === 1 ? "" : "s"} can be added.`
      );
    }

    // Check total user cap
    const decks = await ctx.db
      .query("decks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    let totalCards = 0;
    for (const deck of decks) {
      const count = await ctx.db
        .query("cards")
        .withIndex("by_deck", (q) => q.eq("deckId", deck._id))
        .collect()
        .then((c) => c.length);
      totalCards += count;
      if (totalCards >= MAX_CARDS_PER_USER) break;
    }

    if (totalCards + args.cards.length > MAX_CARDS_PER_USER) {
      const available = MAX_CARDS_PER_USER - totalCards;
      if (available <= 0) {
        throw new Error(
          `You've reached the limit of ${MAX_CARDS_PER_USER.toLocaleString()} total cards. Remove unused cards to make room.`
        );
      }
      throw new Error(
        `Adding ${args.cards.length} cards would exceed your total limit of ${MAX_CARDS_PER_USER.toLocaleString()} cards. Only ${available} more card${available === 1 ? "" : "s"} can be added.`
      );
    }

    const now = Date.now();
    for (const card of args.cards) {
      await ctx.db.insert("cards", {
        deckId: args.deckId,
        front: card.front,
        back: card.back,
        updatedAt: now,
      });
    }
    await ctx.db.patch(args.deckId, { updatedAt: now });
  },
});

export const generateCards = action({
  args: {
    deckId: v.id("decks"),
    prompt: v.string(),
    // When count is omitted, the LLM decides (auto mode)
    count: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<Array<{ front: string; back: string }>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const settings = await ctx.runQuery(internal.settings.getInternal, {
      userId,
    });
    if (!settings?.openAiApiKey) {
      throw new Error("No OpenAI API key configured. Add one in Settings.");
    }

    // Fetch existing cards for this deck
    const existingCards = await ctx.runQuery(internal.cards.getByDeckInternal, {
      deckId: args.deckId,
    });

    const isAuto = args.count === undefined || args.count === null;
    const count = isAuto ? null : Math.min(args.count!, MAX_CARDS);

    // Build system prompt
    let systemPrompt: string;
    if (isAuto) {
      systemPrompt = `You are an expert flashcard generator. Given a topic or study notes, your job is to decide the right number of flashcards and generate them.

Decide on a card count based on the content:
- For a short topic phrase (e.g. "Spanish food vocabulary"): generate ${AUTO_MIN_CARDS}–15 cards covering the most important concepts.
- For a medium-length description or partial notes: generate 10–20 cards that cover all key ideas without repetition.
- For dense or lengthy notes with many distinct facts: generate up to ${AUTO_MAX_CARDS} cards, one per distinct concept.
- Never generate fewer than ${AUTO_MIN_CARDS} or more than ${AUTO_MAX_CARDS} cards.
- Prefer quality over quantity: do not pad with trivial or redundant cards.

Return ONLY valid JSON in this exact format, with no markdown fencing or explanation:
[{"front": "question or prompt text", "back": "answer text"}, ...]`;
    } else {
      systemPrompt = `You are a flashcard generator. Given a topic or notes, create exactly ${count} flashcard pairs suitable for study and memorization.
Return ONLY valid JSON in this exact format, with no markdown fencing or explanation:
[{"front": "question or prompt text", "back": "answer text"}, ...]`;
    }

    // Add existing cards context if any exist (limit to 20 to conserve tokens)
    if (existingCards && existingCards.length > 0) {
      const cardsSummary = existingCards
        .slice(0, 20)
        .map(
          (card: Doc<"cards">) =>
            `Q: ${card.front.slice(0, 80)}${card.front.length > 80 ? "..." : ""} | A: ${card.back.slice(0, 80)}${card.back.length > 80 ? "..." : ""}`
        )
        .join("\n");

      systemPrompt += `

IMPORTANT: Do NOT generate cards that are effectively the same as the existing cards below.
Avoid duplicate or near-duplicate questions, and do not repeat answers already covered.
Existing cards in this deck:
${cardsSummary}`;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.openAiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401) {
        throw new Error("Invalid OpenAI API key. Check your key in Settings.");
      }
      throw new Error(
        `OpenAI API error (${response.status}): ${errorText.slice(0, 200)}`
      );
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";

    // Try to extract JSON from the response (handle potential markdown fencing)
    let jsonStr = content.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    let cards: Array<{ front: string; back: string }>;
    try {
      cards = JSON.parse(jsonStr);
    } catch {
      throw new Error("AI returned invalid JSON. Try rephrasing your prompt.");
    }

    if (!Array.isArray(cards)) {
      throw new Error("AI returned unexpected format. Try again.");
    }

    const filtered = cards
      .filter(
        (c) =>
          typeof c.front === "string" &&
          typeof c.back === "string" &&
          c.front.trim() !== "" &&
          c.back.trim() !== ""
      )
      .slice(0, MAX_CARDS)
      .map((c) => ({ front: c.front.trim(), back: c.back.trim() }));

    return filtered;
  },
});

export const insertGeneratedCards = action({
  args: {
    deckId: v.id("decks"),
    cards: v.array(v.object({ front: v.string(), back: v.string() })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.runMutation(internal.ai.bulkInsertCards, {
      deckId: args.deckId,
      userId,
      cards: args.cards,
    });
  },
});
