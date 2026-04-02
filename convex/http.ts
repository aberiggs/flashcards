import { httpRouter } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { auth } from "./auth";
import {
  coerceDeckId,
  getImageJobErrorMessage,
  IMAGE_JOB_TTL_MS,
  IMAGE_UPLOAD_MAX_BYTES,
} from "./aiImage";

const MAX_CARDS = 100;
const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg"]);

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/ai/generate-from-image",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, {
      headers: corsHeaders(request),
    });
  }),
});

http.route({
  path: "/ai/generate-from-image",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return jsonError(request, "Not authenticated", 401);
    }

    let storageId: Id<"_storage"> | null = null;
    let jobId: Id<"aiImageJobs"> | null = null;

    try {
      const formData = await request.formData();
      const deckIdRaw = formData.get("deckId");
      const image = formData.get("image");

      if (typeof deckIdRaw !== "string" || deckIdRaw.trim() === "") {
        return jsonError(request, "Missing deck ID", 400);
      }

      if (!(image instanceof Blob)) {
        return jsonError(request, "Image upload is required", 400);
      }

      if (!SUPPORTED_IMAGE_TYPES.has(image.type)) {
        return jsonError(
          request,
          "Unsupported image format. Please upload a PNG or JPEG.",
          400
        );
      }

      if (image.size > IMAGE_UPLOAD_MAX_BYTES) {
        return jsonError(
          request,
          "Image is too large. Maximum allowed size is 5MB.",
          400
        );
      }

      const guidanceRaw = formData.get("guidance");
      const guidance =
        typeof guidanceRaw === "string" && guidanceRaw.trim() !== ""
          ? guidanceRaw.trim()
          : undefined;

      const countRaw = formData.get("count");
      let count: number | undefined;
      if (typeof countRaw === "string" && countRaw.trim() !== "") {
        const parsed = Number.parseInt(countRaw, 10);
        if (Number.isNaN(parsed) || parsed < 1 || parsed > MAX_CARDS) {
          return jsonError(request, "Count must be between 1 and 100.", 400);
        }
        count = parsed;
      }

      const deckId = coerceDeckId(deckIdRaw);
      storageId = await ctx.storage.store(image);

      const expiresAt = Date.now() + IMAGE_JOB_TTL_MS;
      jobId = await ctx.runMutation(internal.aiImage.createImageJob, {
        userId,
        deckId,
        storageId,
        expiresAt,
      });

      const cards = await ctx.runAction(internal.aiImage.generateCardsFromStoredImage, {
        userId,
        deckId,
        storageId,
        guidance,
        count,
      });

      if (jobId) {
        await ctx.runMutation(internal.aiImage.markImageJobStatus, {
          jobId,
          status: "completed",
        });
      }

      return jsonResponse(request, { cards }, 200);
    } catch (error) {
      const message = getImageJobErrorMessage(error);
      const status = statusCodeFromMessage(message);

      if (jobId) {
        await ctx.runMutation(internal.aiImage.markImageJobStatus, {
          jobId,
          status: "failed",
          error: message,
        });
      }

      return jsonError(request, message, status);
    } finally {
      if (storageId) {
        let deleted = false;
        try {
          await ctx.storage.delete(storageId);
          deleted = true;
        } catch {
          // Cleanup cron will retry deletion for stale jobs.
        }

        if (jobId && deleted) {
          await ctx.runMutation(internal.aiImage.markImageJobStatus, {
            jobId,
            status: "deleted",
          });
        }
      }
    }
  }),
});

function corsHeaders(request: Request): Headers {
  const origin = request.headers.get("origin") ?? "*";
  return new Headers({
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "origin",
  });
}

function jsonResponse(request: Request, payload: unknown, status: number): Response {
  const headers = corsHeaders(request);
  headers.set("Content-Type", "application/json");

  return new Response(JSON.stringify(payload), {
    status,
    headers,
  });
}

function jsonError(request: Request, message: string, status: number): Response {
  return jsonResponse(request, { error: message }, status);
}

function statusCodeFromMessage(message: string): number {
  if (message === "Not authenticated") {
    return 401;
  }
  if (message.startsWith("ArgumentValidationError")) {
    return 400;
  }
  if (message === "Deck not found") {
    return 404;
  }
  if (
    message.startsWith("No OpenAI API key") ||
    message.startsWith("Could not extract enough reliable text") ||
    message.startsWith("AI returned")
  ) {
    return 400;
  }
  if (message.startsWith("Invalid OpenAI API key")) {
    return 401;
  }
  if (message.startsWith("OpenAI API error (429)")) {
    return 429;
  }
  if (message.startsWith("OpenAI API error (400)")) {
    return 400;
  }
  return 500;
}

export default http;
