import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/server/auth";
import { updateCard, deleteCard, recordReview } from "@/server/queries/cards";
import {
  badRequest,
  handleError,
  parseIdParam,
  unauthorized,
} from "@/server/api";
import type { ConfidenceLevel } from "@/lib/sm2";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; cardId: string }> }
): Promise<NextResponse> {
  const userId = await requireAuthUserId().catch(() => null);
  if (userId === null) return unauthorized();
  const cardId = parseIdParam((await params).cardId);
  if (cardId === null) return badRequest("Invalid card id");
  try {
    const body = (await req.json()) as {
      front?: string;
      back?: string;
      confidence?: ConfidenceLevel;
    };
    if (body.confidence) {
      await recordReview(userId, cardId, body.confidence);
    } else {
      await updateCard(userId, cardId, {
        front: body.front,
        back: body.back,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; cardId: string }> }
): Promise<NextResponse> {
  const userId = await requireAuthUserId().catch(() => null);
  if (userId === null) return unauthorized();
  const cardId = parseIdParam((await params).cardId);
  if (cardId === null) return badRequest("Invalid card id");
  try {
    await deleteCard(userId, cardId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}