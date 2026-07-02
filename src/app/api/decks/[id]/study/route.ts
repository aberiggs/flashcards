import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/server/auth";
import { startSession, completeSession } from "@/server/queries/sessions";
import { badRequest, handleError, parseIdParam, unauthorized } from "@/server/api";

// POST /api/decks/:id/study → start a new session, returns { id }
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = await requireAuthUserId().catch(() => null);
  if (userId === null) return unauthorized();
  const deckId = parseIdParam((await params).id);
  if (deckId === null) return badRequest("Invalid deck id");
  try {
    const id = await startSession(userId, deckId);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

// PATCH /api/decks/:id/study with { sessionId, cardsStudied, cardsCorrect, cardsIncorrect }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = await requireAuthUserId().catch(() => null);
  if (userId === null) return unauthorized();
  const deckId = parseIdParam((await params).id);
  if (deckId === null) return badRequest("Invalid deck id");
  try {
    const body = (await req.json()) as {
      sessionId: number;
      cardsStudied: number;
      cardsCorrect: number;
      cardsIncorrect: number;
    };
    if (body.sessionId == null) return badRequest("sessionId is required");
    await completeSession(userId, body.sessionId, {
      cardsStudied: body.cardsStudied,
      cardsCorrect: body.cardsCorrect,
      cardsIncorrect: body.cardsIncorrect,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}