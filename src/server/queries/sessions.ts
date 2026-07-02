import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { decks, studySessions } from "@/db/schema";

export async function startSession(
  userId: string,
  deckId: number
): Promise<number> {
  const [deck] = await db
    .select({ id: decks.id })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .limit(1);

  if (!deck) throw new Error("Deck not found");

  const [session] = await db
    .insert(studySessions)
    .values({
      userId,
      deckId,
      startedAt: new Date(),
      cardsStudied: 0,
      cardsCorrect: 0,
      cardsIncorrect: 0,
    })
    .returning({ id: studySessions.id });

  return session.id;
}

export async function completeSession(
  userId: string,
  sessionId: number,
  counts: { cardsStudied: number; cardsCorrect: number; cardsIncorrect: number }
): Promise<void> {
  const [session] = await db
    .select()
    .from(studySessions)
    .where(and(eq(studySessions.id, sessionId), eq(studySessions.userId, userId)))
    .limit(1);

  if (!session) throw new Error("Session not found");

  await db
    .update(studySessions)
    .set({
      completedAt: new Date(),
      cardsStudied: counts.cardsStudied,
      cardsCorrect: counts.cardsCorrect,
      cardsIncorrect: counts.cardsIncorrect,
    })
    .where(eq(studySessions.id, sessionId));
}