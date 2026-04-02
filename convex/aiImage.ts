import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";

const MAX_CARDS = 100;
const MAX_ERROR_LENGTH = 300;

export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_JOB_TTL_MS = 2 * 60 * 60 * 1000;

export const createImageJob = internalMutation({
  args: {
    userId: v.id("users"),
    deckId: v.id("decks"),
    storageId: v.id("_storage"),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("aiImageJobs", {
      userId: args.userId,
      deckId: args.deckId,
      storageId: args.storageId,
      status: "processing",
      createdAt: now,
      updatedAt: now,
      expiresAt: args.expiresAt,
    });
  },
});

export const markImageJobStatus = internalMutation({
  args: {
    jobId: v.id("aiImageJobs"),
    status: v.union(
      v.literal("completed"),
      v.literal("failed"),
      v.literal("deleted")
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;

    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      status: args.status,
      updatedAt: now,
      deletedAt: args.status === "deleted" ? now : job.deletedAt,
      error:
        args.error && args.error.trim().length > 0
          ? args.error.slice(0, MAX_ERROR_LENGTH)
          : job.error,
    });
  },
});

export const cleanupExpiredImageJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredJobs = await ctx.db
      .query("aiImageJobs")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .collect();

    for (const job of expiredJobs) {
      if (job.status === "deleted") {
        continue;
      }

      const metadata = await ctx.db.system.get("_storage", job.storageId);
      if (!metadata) {
        await ctx.db.patch(job._id, {
          status: "deleted",
          updatedAt: now,
          deletedAt: now,
        });
        continue;
      }

      let deleted = false;
      try {
        await ctx.storage.delete(job.storageId);
        deleted = true;
      } catch {
        // Ignore and keep job for next sweep.
      }

      if (deleted) {
        await ctx.db.patch(job._id, {
          status: "deleted",
          updatedAt: now,
          deletedAt: now,
        });
      }
    }
  },
});

export const generateCardsFromStoredImage = internalAction({
  args: {
    userId: v.id("users"),
    deckId: v.id("decks"),
    storageId: v.id("_storage"),
    guidance: v.optional(v.string()),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<{ front: string; back: string }>> => {
    const deck = await ctx.runQuery(internal.decks.getInternal, {
      id: args.deckId,
    });

    if (!deck || deck.userId !== args.userId) {
      throw new Error("Deck not found");
    }

    const settings = await ctx.runQuery(internal.settings.getInternal, {
      userId: args.userId,
    });
    if (!settings?.openAiApiKey) {
      throw new Error("No OpenAI API key configured. Add one in Settings.");
    }

    const existingCards = await ctx.runQuery(internal.cards.getByDeckInternal, {
      deckId: args.deckId,
    });

    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) {
      throw new Error("Uploaded image could not be read. Please try again.");
    }

    const hardCap = Math.max(1, Math.min(args.count ?? MAX_CARDS, MAX_CARDS));
    const userGuidance = args.guidance?.trim();

    let systemPrompt = `You are an expert flashcard generator for OCR-based study inputs.

You are given one study image. Extract key facts, terms, formulas, labels, or concepts and produce flashcards from what is visible.

OCR policy (balanced):
- Prioritize text that is clearly legible in the image.
- If a small portion is ambiguous, you may infer only when surrounding context strongly supports one interpretation.
- Do not invent details that are not reasonably grounded in the image.
- If the image quality is too poor to extract enough reliable content, return fewer cards instead of hallucinating.

Card quality defaults:
- Each card tests one concept.
- Fronts should be clear and specific prompts.
- Backs should be concise, factual answers.
- Avoid yes/no questions unless unavoidable.
- Avoid duplicate or near-duplicate cards.

Return ONLY valid JSON in this exact format, with no markdown fencing or explanation:
[{"front": "question or prompt text", "back": "answer text"}, ...]

You must return at least 1 card and at most ${hardCap} cards.`;

    if (existingCards.length > 0) {
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

    const userPrompt = userGuidance
      ? `Additional user guidance:\n${userGuidance}`
      : "Generate cards from this image.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.openAiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: fileUrl,
                },
              },
            ],
          },
        ],
        temperature: 0.5,
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

    let jsonStr = content.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    let cards: Array<{ front: string; back: string }>;
    try {
      cards = JSON.parse(jsonStr);
    } catch {
      throw new Error("AI returned invalid JSON. Try a clearer image.");
    }

    if (!Array.isArray(cards)) {
      throw new Error("AI returned unexpected format. Try again.");
    }

    const filtered = cards
      .filter(
        (card) =>
          typeof card.front === "string" &&
          typeof card.back === "string" &&
          card.front.trim() !== "" &&
          card.back.trim() !== ""
      )
      .slice(0, hardCap)
      .map((card) => ({
        front: card.front.trim(),
        back: card.back.trim(),
      }));

    if (filtered.length === 0) {
      throw new Error(
        "Could not extract enough reliable text from this image. Try a clearer photo with better lighting and focus."
      );
    }

    return filtered;
  },
});

export function getImageJobErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.length > 0) {
      return message.slice(0, MAX_ERROR_LENGTH);
    }
  }
  return "Unexpected image generation error.";
}

export function coerceDeckId(rawDeckId: string): Id<"decks"> {
  return rawDeckId as Id<"decks">;
}
