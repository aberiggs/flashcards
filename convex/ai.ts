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
const IMAGE_UPLOAD_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

type UploadSessionStatus =
  | "issued"
  | "uploaded"
  | "consumed"
  | "cancelled"
  | "expired";

interface UploadSessionResult {
  storageId: Id<"_storage">;
  uploadSessionId: Id<"imageUploadSessions">;
}

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
    const now = Date.now();
    const uploadSessionId = await ctx.db.insert("imageUploadSessions", {
      userId,
      status: "issued",
      createdAt: now,
      updatedAt: now,
      expiresAt: now + IMAGE_UPLOAD_SESSION_TTL_MS,
    });
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return {
      uploadUrl,
      uploadSessionId,
    };
  },
});

/** Client calls this after a successful upload POST to attach storage to session. */
export const registerUpload = mutation({
  args: {
    uploadSessionId: v.id("imageUploadSessions"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.uploadSessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Upload session not found. Please re-upload.");
    }

    if (session.status === "consumed" || session.status === "cancelled") {
      throw new Error("Upload session is no longer valid. Please re-upload.");
    }

    if (session.status === "expired" || session.expiresAt <= Date.now()) {
      throw new Error("Upload session expired. Please re-upload the image.");
    }

    if (session.status === "uploaded") {
      if (session.storageId === args.storageId) {
        return;
      }
      throw new Error("Upload session already has a different file.");
    }

    const fileMeta = await ctx.db.system.get(args.storageId);
    if (!fileMeta) throw new Error("Uploaded file not found.");

    if (
      !fileMeta.contentType ||
      !(ALLOWED_IMAGE_TYPES as readonly string[]).includes(fileMeta.contentType)
    ) {
      await ctx.storage.delete(args.storageId);
      await ctx.db.patch(args.uploadSessionId, {
        status: "cancelled",
        storageId: args.storageId,
        updatedAt: Date.now(),
        lastError: "Invalid file type.",
      });
      throw new Error(
        "Invalid file type. Please upload a PNG, JPEG, WEBP, or GIF image."
      );
    }

    if (fileMeta.size > MAX_IMAGE_SIZE_BYTES) {
      await ctx.storage.delete(args.storageId);
      await ctx.db.patch(args.uploadSessionId, {
        status: "cancelled",
        storageId: args.storageId,
        updatedAt: Date.now(),
        lastError: "File exceeded size limit.",
      });
      throw new Error("Image must be under 20 MB.");
    }

    const existingRows = await ctx.db
      .query("imageUploadSessions")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .collect();

    const conflictingRow = existingRows.find(
      (row) => row._id !== args.uploadSessionId
    );
    if (conflictingRow) {
      throw new Error("Upload already linked to another session.");
    }

    await ctx.db.patch(args.uploadSessionId, {
      status: "uploaded",
      storageId: args.storageId,
      updatedAt: Date.now(),
      expiresAt: Date.now() + IMAGE_UPLOAD_SESSION_TTL_MS,
    });
  },
});

/** Validate that an uploaded image session belongs to the caller and is usable. */
export const validateUploadedImageSession = internalQuery({
  args: {
    uploadSessionId: v.id("imageUploadSessions"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<UploadSessionResult> => {
    const session = await ctx.db.get(args.uploadSessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Upload session not found. Please re-upload the image.");
    }

    if (session.status !== "uploaded") {
      throw new Error("Upload session is not ready. Please re-upload the image.");
    }

    if (!session.storageId) {
      throw new Error("Image not found. Please re-upload.");
    }

    if (session.expiresAt <= Date.now()) {
      throw new Error("Upload session expired. Please re-upload the image.");
    }

    const fileMeta = await ctx.db.system.get(session.storageId);
    if (!fileMeta) {
      throw new Error("Image not found. Please re-upload.");
    }

    if (
      !fileMeta.contentType ||
      !(ALLOWED_IMAGE_TYPES as readonly string[]).includes(fileMeta.contentType)
    ) {
      throw new Error(
        "Invalid file type. Please upload a PNG, JPEG, WEBP, or GIF image."
      );
    }

    if (fileMeta.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error("Image must be under 20 MB.");
    }

    return {
      storageId: session.storageId,
      uploadSessionId: session._id,
    };
  },
});

/** Finalize an upload session and best-effort delete the backing file. */
export const finalizeUploadSession = internalMutation({
  args: {
    uploadSessionId: v.id("imageUploadSessions"),
    userId: v.id("users"),
    targetStatus: v.union(
      v.literal("consumed"),
      v.literal("cancelled"),
      v.literal("expired")
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.uploadSessionId);
    if (!session || session.userId !== args.userId) {
      return;
    }

    if (
      session.status === "consumed" ||
      session.status === "cancelled" ||
      session.status === "expired"
    ) {
      return;
    }

    if (session.storageId) {
      const fileMeta = await ctx.db.system.get(session.storageId);
      if (fileMeta) {
        await ctx.storage.delete(session.storageId);
      }
    }

    await ctx.db.patch(args.uploadSessionId, {
      status: args.targetStatus,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Best-effort client cleanup for abandoned or failed image generation flows.
 *
 * Important: callers should treat this as opportunistic cleanup, not a strict
 * guarantee. A modal close/unmount can race with the storage upload finishing:
 * we may receive one cancel call before storageId is known, then a second call
 * with storageId after upload settles. The fallback block below handles that
 * late-arriving storageId case even if the session is already cancelled.
 */
export const cancelUpload = mutation({
  args: {
    uploadSessionId: v.id("imageUploadSessions"),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.uploadSessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Upload session not found.");
    }

    // Fallback cleanup for the case where upload succeeded but registerUpload
    // failed before the session was linked to storageId. This can happen when
    // the user closes the modal mid-upload and cancellation races with upload.
    if (!session.storageId && args.storageId) {
      const sameStorageRows = await ctx.db
        .query("imageUploadSessions")
        .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
        .collect();

      const conflictingRow = sameStorageRows.find((row) => row._id !== session._id);
      if (conflictingRow) {
        throw new Error("Upload session not found.");
      }

      const fileMeta = await ctx.db.system.get(args.storageId);
      if (fileMeta) {
        await ctx.storage.delete(args.storageId);
      }

      await ctx.db.patch(args.uploadSessionId, {
        storageId: args.storageId,
        status: "cancelled",
        updatedAt: Date.now(),
        lastError: "Cancelled before upload registration completed.",
      });
      return;
    }

    if (session.status !== "issued" && session.status !== "uploaded") {
      return;
    }

    await ctx.runMutation(internal.ai.finalizeUploadSession, {
      uploadSessionId: args.uploadSessionId,
      userId,
      targetStatus: "cancelled",
    });
  },
});

/** Cron job: delete uploads older than 30 minutes that were never consumed. */
export const sweepOrphanedUploads = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expirableStatuses: UploadSessionStatus[] = ["issued", "uploaded"];

    for (const status of expirableStatuses) {
      const stale = await ctx.db
        .query("imageUploadSessions")
        .withIndex("by_status_expires", (q) =>
          q.eq("status", status).lt("expiresAt", now)
        )
        .collect();

      for (const session of stale) {
        await ctx.runMutation(internal.ai.finalizeUploadSession, {
          uploadSessionId: session._id,
          userId: session.userId,
          targetStatus: "expired",
        });
      }
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
    // Required when mode is "image" — references the tracked upload session
    imageUploadSessionId: v.optional(v.id("imageUploadSessions")),
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

    if (args.mode !== "image" && promptText.length === 0) {
      throw new Error("Prompt is required for topic and notes modes.");
    }

    // For image mode, validate ownership + file constraints, then resolve URL
    let imageUrl: string | null = null;
    let validatedUploadSessionId: Id<"imageUploadSessions"> | null = null;

    if (args.mode === "image") {
      if (!args.imageUploadSessionId) {
        throw new Error("Image is required for image mode.");
      }
      const imageUploadSessionId = args.imageUploadSessionId;

      // Server-side ownership + file validation
      const uploadMeta = await ctx.runQuery(
        internal.ai.validateUploadedImageSession,
        {
          uploadSessionId: imageUploadSessionId,
          userId,
        }
      );
      validatedUploadSessionId = uploadMeta.uploadSessionId;

      const imageStorageId = uploadMeta.storageId;

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
      // Clean up the uploaded image and its tracking session regardless of success/failure.
      if (validatedUploadSessionId) {
        await ctx.runMutation(internal.ai.finalizeUploadSession, {
          uploadSessionId: validatedUploadSessionId,
          userId,
          targetStatus: "consumed",
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
