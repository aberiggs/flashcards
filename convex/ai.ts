import { getAuthUserId } from "@convex-dev/auth/server";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const bulkInsertCards = internalMutation({
  args: {
    deckId: v.id("decks"),
    cards: v.array(v.object({ front: v.string(), back: v.string() })),
  },
  handler: async (ctx, args) => {
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

    const count = args.count ?? 10;
    
    // Build system prompt with existing cards context
    let systemPrompt = `You are a flashcard generator. Given a topic or notes, create exactly ${count} flashcard pairs suitable for study and memorization.
Return ONLY valid JSON in this exact format, with no markdown fencing or explanation:
[{"front": "question or prompt text", "back": "answer text"}, ...]`;

    // Add existing cards context if any exist (limit to 20 to conserve tokens)
    if (existingCards && existingCards.length > 0) {
      // Format existing cards concisely to conserve tokens
      const cardsSummary = existingCards
        .slice(0, 20)
        .map((card: any) => `Q: ${card.front.slice(0, 80)}${card.front.length > 80 ? '...' : ''} | A: ${card.back.slice(0, 80)}${card.back.length > 80 ? '...' : ''}`)
        .join('\n');
      
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
      throw new Error(
        "AI returned invalid JSON. Try rephrasing your prompt."
      );
    }

    if (!Array.isArray(cards)) {
      throw new Error("AI returned unexpected format. Try again.");
    }

    return cards
      .filter(
        (c) =>
          typeof c.front === "string" &&
          typeof c.back === "string" &&
          c.front.trim() !== "" &&
          c.back.trim() !== ""
      )
      .slice(0, 20)
      .map((c) => ({ front: c.front.trim(), back: c.back.trim() }));
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
      cards: args.cards,
    });
  },
});
