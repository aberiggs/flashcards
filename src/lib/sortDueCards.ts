import type { Card } from "@/lib/hooks";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Sort due cards for a study session:
 *   1. Overdue day-bucket desc — most overdue day first (cards due within the
 *      same day of each other are treated as equally urgent).
 *   2. repetitions asc — lower SRS level (New/Learning) before higher
 *      (Reviewing/Mastered), so struggling cards surface earlier.
 *   3. shuffle within a day-bucket + SRS level so the user recalls from memory
 *      rather than a memorized creation order.
 *
 * Pure function — does not mutate the input. Pass a `random` function for
 * deterministic tests (a stable comparator is used, so the same `random`
 * sequence always produces the same order).
 *
 * Input is expected to be due cards only (nextReview <= now). The bucket is
 * clamped at 0 so that any future-dated card passed in cannot outrank an
 * overdue one — it simply sorts as if due now.
 */
export function sortDueCards(
  cards: Card[],
  random: () => number = Math.random,
  now: number = Date.now()
): Card[] {
  const tagged = cards.map((card) => ({
    card,
    bucket: Math.max(
      0,
      Math.floor((now - new Date(card.nextReview).getTime()) / MS_PER_DAY)
    ),
    shuffle: random(),
  }));

  tagged.sort((a, b) => {
    if (a.bucket !== b.bucket) return b.bucket - a.bucket;
    if (a.card.repetitions !== b.card.repetitions) {
      return a.card.repetitions - b.card.repetitions;
    }
    return a.shuffle - b.shuffle;
  });

  return tagged.map((t) => t.card);
}
