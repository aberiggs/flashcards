import { getAuthUserId } from "@convex-dev/auth/server";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { MAX_CARDS_PER_DECK, MAX_CARDS_PER_USER } from "./limits";

const MAX_CARDS = 100;
const AUTO_MIN_CARDS = 1;
const AUTO_MAX_CARDS = 100;

const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

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

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const deleteStorageFile = internalMutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId);
  },
});

/** Client calls this after a successful upload POST to register the file for tracking. */
export const registerUpload = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify the file actually exists in storage
    const fileMeta = await ctx.db.system.get(args.storageId);
    if (!fileMeta) throw new Error("Uploaded file not found.");

    await ctx.db.insert("pendingUploads", {
      storageId: args.storageId,
      userId,
      createdAt: Date.now(),
    });
  },
});

/** Validate that the upload belongs to the caller and meets file constraints. */
export const validateUpload = internalQuery({
  args: {
    storageId: v.id("_storage"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Ownership check via pendingUploads
    const pending = await ctx.db
      .query("pendingUploads")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .unique();

    if (!pending) {
      throw new Error("Upload not found. Please re-upload the image.");
    }
    if (pending.userId !== args.userId) {
      throw new Error("Upload not found. Please re-upload the image.");
    }

    // Get storage metadata for server-side validation
    const fileMeta = await ctx.db.system.get(args.storageId);
    if (!fileMeta) {
      throw new Error("Image not found. Please re-upload.");
    }

    return {
      contentType: fileMeta.contentType ?? null,
      size: fileMeta.size,
      pendingUploadId: pending._id,
    };
  },
});

/** Remove both the storage file and its pendingUploads tracking row. */
export const cleanupUpload = internalMutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    // Delete the storage file
    await ctx.storage.delete(args.storageId);

    // Delete the tracking row
    const pending = await ctx.db
      .query("pendingUploads")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .unique();
    if (pending) {
      await ctx.db.delete(pending._id);
    }
  },
});

const ORPHAN_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

/** Cron job: delete uploads older than 30 minutes that were never consumed. */
export const sweepOrphanedUploads = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - ORPHAN_THRESHOLD_MS;
    const stale = await ctx.db
      .query("pendingUploads")
      .withIndex("by_created", (q) => q.lt("createdAt", cutoff))
      .collect();

    for (const row of stale) {
      await ctx.storage.delete(row.storageId);
      await ctx.db.delete(row._id);
    }
  },
});

export const generateCards = action({
  args: {
    deckId: v.id("decks"),
    prompt: v.optional(v.string()),
    // "topic" = generate from a subject/theme, "notes" = extract from pasted material, "image" = extract from uploaded image
    mode: v.union(
      v.literal("topic"),
      v.literal("notes"),
      v.literal("image")
    ),
    // When count is omitted, the LLM decides (auto mode)
    count: v.optional(v.number()),
    // Required when mode is "image" — references the uploaded file in Convex storage
    imageStorageId: v.optional(v.id("_storage")),
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

    const promptText = (args.prompt ?? "").trim();

    // For image mode, validate ownership + file constraints, then resolve URL
    let imageUrl: string | null = null;
    let imageStorageId: Id<"_storage"> | null = null;

    if (args.mode === "image") {
      if (!args.imageStorageId) {
        throw new Error("Image is required for image mode.");
      }
      imageStorageId = args.imageStorageId;

      // Server-side ownership + file validation
      const uploadMeta = await ctx.runQuery(internal.ai.validateUpload, {
        storageId: imageStorageId,
        userId,
      });

      if (
        !uploadMeta.contentType ||
        !(ALLOWED_IMAGE_TYPES as readonly string[]).includes(
          uploadMeta.contentType
        )
      ) {
        // Clean up the invalid file
        await ctx.runMutation(internal.ai.cleanupUpload, {
          storageId: imageStorageId,
        });
        throw new Error(
          "Invalid file type. Please upload a PNG, JPEG, WEBP, or GIF image."
        );
      }

      if (uploadMeta.size > MAX_IMAGE_SIZE_BYTES) {
        await ctx.runMutation(internal.ai.cleanupUpload, {
          storageId: imageStorageId,
        });
        throw new Error("Image must be under 20 MB.");
      }

      const url = await ctx.storage.getUrl(imageStorageId);
      if (!url) {
        throw new Error("Image not found. Please re-upload.");
      }
      imageUrl = url;
    }

    // Fetch existing cards for this deck
    const existingCards = await ctx.runQuery(internal.cards.getByDeckInternal, {
      deckId: args.deckId,
    });

    const isAuto = args.count === undefined || args.count === null;
    const count = isAuto ? null : Math.min(args.count!, MAX_CARDS);
    const isImage = args.mode === "image";
    const isTopic = args.mode === "topic";

    // Build system prompt — differentiate between topic, notes, and image modes
    let systemPrompt: string;

    const qualityRules = `Card quality defaults (follow these unless the user's prompt specifies otherwise):
- Each card should test exactly one concept. Do not combine multiple facts into a single card.
- Fronts should be clear, specific questions or prompts — not vague or overly broad.
- Backs should be concise, direct answers — not long paragraphs.
- Prefer "What is…", "How does…", "Name the…", "Define…" style prompts over yes/no questions.
- Do not generate cards with identical or near-identical fronts to each other.`;

    const jsonInstruction = `Return ONLY valid JSON in this exact format, with no markdown fencing or explanation:
[{"front": "question or prompt text", "back": "answer text"}, ...]`;

    if (isImage) {
      if (isAuto) {
        systemPrompt = `You are an expert flashcard generator with vision capabilities. You will be given an image (handwritten notes, textbook page, whiteboard, diagram, etc.) and must extract key facts, concepts, and information visible in it to create flashcards.

Decide on a card count based on the density of extractable content:
- Image with a few key points or a short list: generate ${AUTO_MIN_CARDS}–10 cards.
- Image with moderate content (a page of notes, a diagram with labels): generate 10–20 cards.
- Dense image with many distinct facts or extensive text: generate up to ${AUTO_MAX_CARDS} cards.
- Never generate fewer than ${AUTO_MIN_CARDS} or more than ${AUTO_MAX_CARDS} cards.
- Create one card per distinct fact or concept — do not combine multiple ideas into one card.
- Only create cards from content you can clearly read or identify. Skip illegible sections rather than guessing.
- If the image contains text in a non-English language, create cards in that language unless the user requests otherwise.

${qualityRules}

${jsonInstruction}`;
      } else {
        systemPrompt = `You are a flashcard generator with vision capabilities. You will be given an image (handwritten notes, textbook page, whiteboard, diagram, etc.) and must extract key facts, concepts, and information visible in it to create exactly ${count} flashcards.

You MUST return exactly ${count} cards — no more, no fewer. Count your output carefully before responding.
- Only create cards from content you can clearly read or identify. Skip illegible sections rather than guessing.
- If the image contains text in a non-English language, create cards in that language unless the user requests otherwise.

${qualityRules}

${jsonInstruction}`;
      }
    } else if (isAuto) {
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

    // Build the messages array — image mode uses multipart content with image_url
    type ChatMessage =
      | { role: string; content: string }
      | {
          role: string;
          content: Array<
            | { type: "text"; text: string }
            | { type: "image_url"; image_url: { url: string; detail: string } }
          >;
        };

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
    ];

    if (isImage && imageUrl) {
      const userContent: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string; detail: string } }
      > = [
        { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
      ];
      // Add optional context from the user if provided
      if (promptText) {
        userContent.unshift({
          type: "text",
          text: promptText,
        });
      }
      messages.push({ role: "user", content: userContent });
    } else {
      messages.push({ role: "user", content: promptText });
    }

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.openAiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages,
            temperature: 0.7,
            max_tokens: 8000,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          throw new Error(
            "Invalid OpenAI API key. Check your key in Settings."
          );
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

      if (isImage && filtered.length === 0) {
        throw new Error(
          "Could not extract content from this image. Try a clearer photo or add context about what the image contains."
        );
      }

      return filtered;
    } finally {
      // Clean up the uploaded image and its tracking row regardless of success or failure
      if (imageStorageId) {
        await ctx.runMutation(internal.ai.cleanupUpload, {
          storageId: imageStorageId,
        });
      }
    }
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
