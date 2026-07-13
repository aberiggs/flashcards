import { describe, it, expect } from "vitest";
import { sortDueCards } from "@/lib/sortDueCards";
import type { Card } from "@/lib/hooks";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000; // deterministic epoch ms

function makeCard(overrides: Partial<Card> & { id: number }): Card {
  return {
    deckId: 1,
    front: `f${overrides.id}`,
    back: `b${overrides.id}`,
    efactor: 2.5,
    repetitions: 0,
    nextReview: new Date(NOW).toISOString(),
    lastStudied: null,
    createdAt: new Date(NOW).toISOString(),
    updatedAt: new Date(NOW).toISOString(),
    ...overrides,
  };
}

// Deterministic PRNG (mulberry32) so tests are fully reproducible.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("sortDueCards", () => {
  it("returns an empty array unchanged", () => {
    expect(sortDueCards([], mulberry32(1), NOW)).toEqual([]);
  });

  it("sorts most-overdue day-bucket first (desc by days overdue)", () => {
    const cards = [
      makeCard({ id: 1, nextReview: new Date(NOW - 1 * DAY).toISOString(), repetitions: 0 }),
      makeCard({ id: 2, nextReview: new Date(NOW - 3 * DAY).toISOString(), repetitions: 0 }),
      makeCard({ id: 3, nextReview: new Date(NOW - 2 * DAY).toISOString(), repetitions: 0 }),
    ];
    const sorted = sortDueCards(cards, () => 0.5, NOW);
    expect(sorted.map((c) => c.id)).toEqual([2, 3, 1]);
  });

  it("sorts lower SRS level (repetitions) first within the same day-bucket", () => {
    const cards = [
      makeCard({ id: 1, repetitions: 3, nextReview: new Date(NOW - DAY).toISOString() }),
      makeCard({ id: 2, repetitions: 0, nextReview: new Date(NOW - DAY).toISOString() }),
      makeCard({ id: 3, repetitions: 1, nextReview: new Date(NOW - DAY).toISOString() }),
    ];
    const sorted = sortDueCards(cards, () => 0.5, NOW);
    expect(sorted.map((c) => c.id)).toEqual([2, 3, 1]);
  });

  it("day-bucket takes precedence over repetitions", () => {
    // id=1 is 2 days overdue but reps=5; id=2 is 1 day overdue but reps=0.
    // Day-bucket wins, so id=1 (more overdue) sorts first despite higher reps.
    const cards = [
      makeCard({ id: 1, repetitions: 5, nextReview: new Date(NOW - 2 * DAY).toISOString() }),
      makeCard({ id: 2, repetitions: 0, nextReview: new Date(NOW - 1 * DAY).toISOString() }),
    ];
    const sorted = sortDueCards(cards, () => 0.5, NOW);
    expect(sorted.map((c) => c.id)).toEqual([1, 2]);
  });

  it("shuffles within the same day-bucket and SRS level using the injected random", () => {
    // All three cards share bucket=1, reps=0. With a constant random()=0.5
    // the sort is stable, so insertion order is preserved. With a seeded PRNG
    // the order is deterministic but non-trivial.
    const cards = [
      makeCard({ id: 10, nextReview: new Date(NOW - DAY).toISOString(), repetitions: 0 }),
      makeCard({ id: 20, nextReview: new Date(NOW - DAY).toISOString(), repetitions: 0 }),
      makeCard({ id: 30, nextReview: new Date(NOW - DAY).toISOString(), repetitions: 0 }),
    ];

    const rand = mulberry32(42);
    const sorted = sortDueCards(cards, rand, NOW);

    // Deterministic for seed=42 — verified by running the test.
    expect(sorted.map((c) => c.id)).toEqual([20, 10, 30]);
  });

  it("produces a different order for a different random seed (shuffle is real)", () => {
    const cards = [
      makeCard({ id: 10, nextReview: new Date(NOW - DAY).toISOString(), repetitions: 0 }),
      makeCard({ id: 20, nextReview: new Date(NOW - DAY).toISOString(), repetitions: 0 }),
      makeCard({ id: 30, nextReview: new Date(NOW - DAY).toISOString(), repetitions: 0 }),
      makeCard({ id: 40, nextReview: new Date(NOW - DAY).toISOString(), repetitions: 0 }),
    ];

    const orderA = sortDueCards(cards, mulberry32(1), NOW).map((c) => c.id);
    const orderB = sortDueCards(cards, mulberry32(2), NOW).map((c) => c.id);

    expect(orderA).not.toEqual(orderB);
  });

  it("does not mutate the input array", () => {
    const cards = [
      makeCard({ id: 1, nextReview: new Date(NOW - 2 * DAY).toISOString(), repetitions: 0 }),
      makeCard({ id: 2, nextReview: new Date(NOW - 1 * DAY).toISOString(), repetitions: 0 }),
    ];
    const snapshot = cards.map((c) => c.id);
    sortDueCards(cards, mulberry32(1), NOW);
    expect(cards.map((c) => c.id)).toEqual(snapshot);
  });

  it("treats cards overdue by <1 day as the same bucket (bucket 0)", () => {
    // 30s overdue and 12h overdue both fall in bucket 0.
    const cards = [
      makeCard({ id: 1, repetitions: 0, nextReview: new Date(NOW - 30_000).toISOString() }),
      makeCard({ id: 2, repetitions: 0, nextReview: new Date(NOW - 12 * 60 * 60 * 1000).toISOString() }),
    ];
    const sorted = sortDueCards(cards, () => 0.5, NOW);
    // Same bucket + same reps → stable (constant random), insertion order.
    expect(sorted.map((c) => c.id)).toEqual([1, 2]);
  });
});