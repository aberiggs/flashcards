import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/server/auth";
import { importDeck, type ImportCardInput } from "@/server/queries/import";
import { handleError, unauthorized } from "@/server/api";

export async function POST(req: Request): Promise<NextResponse> {
  const userId = await requireAuthUserId().catch(() => null);
  if (userId === null) return unauthorized();
  try {
    const body = (await req.json()) as {
      name: string;
      description?: string;
      cards: ImportCardInput[];
    };
    const id = await importDeck(userId, body.name, body.description, body.cards);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}