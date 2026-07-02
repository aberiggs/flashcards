import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/server/auth";
import {
  listDecks,
  createDeck,
} from "@/server/queries/decks";
import { handleError, unauthorized } from "@/server/api";

export async function GET(): Promise<NextResponse> {
  const userId = await requireAuthUserId().catch(() => null);
  if (userId === null) return unauthorized();
  const decks = await listDecks(userId);
  return NextResponse.json(decks);
}

export async function POST(req: Request): Promise<NextResponse> {
  const userId = await requireAuthUserId().catch(() => null);
  if (userId === null) return unauthorized();
  try {
    const body = (await req.json()) as {
      name: string;
      description?: string;
    };
    const id = await createDeck(userId, body.name, body.description);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}