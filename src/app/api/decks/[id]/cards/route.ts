import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/server/auth";
import {
  getCardsByDeck,
  getDueCardsByDeck,
  createCard,
} from "@/server/queries/cards";
import { badRequest, handleError, parseIdParam, unauthorized } from "@/server/api";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = await requireAuthUserId().catch(() => null);
  if (userId === null) return unauthorized();
  const deckId = parseIdParam((await params).id);
  if (deckId === null) return badRequest("Invalid deck id");

  const url = new URL(req.url);
  const due = url.searchParams.get("due") === "true";

  const cards = due
    ? await getDueCardsByDeck(userId, deckId)
    : await getCardsByDeck(userId, deckId);
  return NextResponse.json(cards);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = await requireAuthUserId().catch(() => null);
  if (userId === null) return unauthorized();
  const deckId = parseIdParam((await params).id);
  if (deckId === null) return badRequest("Invalid deck id");
  try {
    const body = (await req.json()) as { front: string; back: string };
    const id = await createCard(userId, deckId, body.front, body.back);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}