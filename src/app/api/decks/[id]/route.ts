import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/server/auth";
import {
  getDeckWithCards,
  updateDeck,
  deleteDeck,
} from "@/server/queries/decks";
import { badRequest, handleError, notFound, parseIdParam, unauthorized } from "@/server/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = await requireAuthUserId().catch(() => null);
  if (userId === null) return unauthorized();
  const deckId = parseIdParam((await params).id);
  if (deckId === null) return badRequest("Invalid deck id");
  const deck = await getDeckWithCards(userId, deckId);
  if (!deck) return notFound("Deck not found");
  return NextResponse.json(deck);
}

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
      name?: string;
      description?: string;
    };
    await updateDeck(userId, deckId, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = await requireAuthUserId().catch(() => null);
  if (userId === null) return unauthorized();
  const deckId = parseIdParam((await params).id);
  if (deckId === null) return badRequest("Invalid deck id");
  try {
    await deleteDeck(userId, deckId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}