import { getAuthUserId } from "@convex-dev/auth/server";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { MAX_CARDS_PER_DECK, MAX_CARDS_PER_USER } from "./limits";

const MAX_CARDS = 100;
const AUTO_MIN_CARDS = 1;
const AUTO_MAX_CARDS = 100;

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
    // "topic" = generate from a subject/theme, "notes" = extract from pasted material
    mode: v.union(v.literal("topic"), v.literal("notes")),
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
    const isTopic = args.mode === "topic";

    // Build system prompt — differentiate between topic and notes modes
    let systemPrompt: string;

    const qualityRules = `Card quality defaults (follow these unless the user's prompt specifies otherwise):
- Each card should test exactly one concept. Do not combine multiple facts into a single card.
- Fronts should be clear, specific questions or prompts — not vague or overly broad.
- Backs should be concise, direct answers — not long paragraphs.
- Prefer "What is…", "How does…", "Name the…", "Define…" style prompts over yes/no questions.
- Do not generate cards with identical or near-identical fronts to each other.`;

    const jsonInstruction = `Return ONLY valid JSON in this exact format, with no markdown fencing or explanation:
[{"front": "question or prompt text", "back": "answer text"}, ...]`;

    if (isAuto) {
      if (isTopic) {
        systemPrompt = `You are an expert flashcard generator. Given a topic or subject, generate flashcards that cover its key concepts, definitions, and relationships.

Decide on a card count based on how broad the topic is:
- Narrow topic (e.g. "Spanish food vocabulary"): generate ${AUTO_MIN_CARDS}–15 cards covering the most important items.
- Medium topic (e.g. "World War II causes"): generate 10–20 cards covering distinct concepts.
- Broad topic (e.g. "Organic Chemistry"): generate up to ${AUTO_MAX_CARDS} cards, one per distinct concept.
- Never generate fewer than ${AUTO_MIN_CARDS} or more than ${AUTO_MAX_CARDS} cards.
- Prefer quality over quantity: do not pad with trivial or redundant cards.
- Focus on testable facts, definitions, and distinctions — not opinions or vague summaries.

${qualityRules}

${jsonInstruction}`;
      } else {
        systemPrompt = `You are an expert flashcard generator. Given study notes or reference material, extract the key facts, terms, and concepts and turn each into a focused flashcard.

Decide on a card count based on the density of the material:
- Brief notes with a few key points: generate ${AUTO_MIN_CARDS}–10 cards.
- Moderate notes covering multiple topics: generate 10–20 cards.
- Dense or lengthy material with many distinct facts: generate up to ${AUTO_MAX_CARDS} cards.
- Never generate fewer than ${AUTO_MIN_CARDS} or more than ${AUTO_MAX_CARDS} cards.
- Create one card per distinct fact or concept — do not combine multiple ideas into one card.
- Stick closely to what the notes actually say. Do not invent facts beyond the provided material.

${qualityRules}

${jsonInstruction}`;
      }
    } else {
      if (isTopic) {
        systemPrompt = `You are a flashcard generator. Given a topic or subject, create exactly ${count} flashcard pairs covering its key concepts, definitions, and relationships. Focus on testable facts and distinctions.

You MUST return exactly ${count} cards — no more, no fewer. Count your output carefully before responding.

${qualityRules}

${jsonInstruction}`;
      } else {
        systemPrompt = `You are a flashcard generator. Given study notes or reference material, extract exactly ${count} key facts, terms, or concepts and turn each into a focused flashcard. Stick closely to what the notes say.

You MUST return exactly ${count} cards — no more, no fewer. Count your output carefully before responding.

${qualityRules}

${jsonInstruction}`;
      }
    }

    // Add existing card fronts so the LLM avoids generating duplicates.
    // We send only the front text (truncated) to keep token usage reasonable
    // while covering the entire deck — not just the first 20.
    if (existingCards && existingCards.length > 0) {
      const existingFronts = existingCards
        .map(
          (card: Doc<"cards">) =>
            `- ${card.front.slice(0, 100)}${card.front.length > 100 ? "…" : ""}`
        )
        .join("\n");

      systemPrompt += `

IMPORTANT: This deck already contains the cards listed below. Do NOT generate cards that duplicate or closely rephrase any of these existing questions.
Existing card questions (${existingCards.length}):
${existingFronts}`;
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
        max_tokens: 8000,
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

    // When a specific count was requested, enforce it as a hard cap so the
    // user never gets more cards than they asked for even if the LLM overshoots.
    const hardCap = count ?? MAX_CARDS;

    const filtered = cards
      .filter(
        (c) =>
          typeof c.front === "string" &&
          typeof c.back === "string" &&
          c.front.trim() !== "" &&
          c.back.trim() !== ""
      )
      .slice(0, hardCap)
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
