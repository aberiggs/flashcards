import { describe, it, expect } from "vitest";
import {
  getMemoryStage,
  getCardTier,
  tierOrdinal,
  CARD_TIERS,
  TIER_TO_STAGE,
  type CardTier,
} from "@/lib/memoryStage";

describe("getMemoryStage", () => {
  it.each([
    [0, "New"],
    [1, "Learning"],
    [2, "Learning"],
    [3, "Reviewing"],
    [4, "Reviewing"],
    [5, "Reviewing"],
    [6, "Mastered"],
    [10, "Mastered"],
    [100, "Mastered"],
  ])("repetitions=%i → %s", (reps, expected) => {
    expect(getMemoryStage(reps)).toBe(expected);
  });

  it("handles negative repetitions as Learning (<=2 branch)", () => {
    // Not a real state, but the function should not throw. -1 falls into the
    // `<= 2` bucket, so it reports Learning rather than New.
    expect(getMemoryStage(-1)).toBe("Learning");
  });
});

describe("getCardTier", () => {
  it.each([
    [-3, "Seed"],
    [-1, "Seed"],
    [0, "Seed"],
    [1, "Sprout"],
    [2, "Seedling"],
    [3, "Sapling"],
    [4, "Bud"],
    [5, "Bloom"],
    [6, "Fruit"],
    [7, "Fruit"],
    [50, "Fruit"],
    [1000, "Fruit"],
  ])("repetitions=%i → %s", (reps, expected) => {
    expect(getCardTier(reps)).toBe(expected);
  });

  it("never returns undefined for any integer 0..100", () => {
    for (let i = 0; i <= 100; i++) {
      const tier = getCardTier(i);
      expect(CARD_TIERS).toContain(tier);
    }
  });
});

describe("tierOrdinal", () => {
  it("returns 0-based position in CARD_TIERS", () => {
    expect(tierOrdinal("Seed")).toBe(0);
    expect(tierOrdinal("Sprout")).toBe(1);
    expect(tierOrdinal("Seedling")).toBe(2);
    expect(tierOrdinal("Sapling")).toBe(3);
    expect(tierOrdinal("Bud")).toBe(4);
    expect(tierOrdinal("Bloom")).toBe(5);
    expect(tierOrdinal("Fruit")).toBe(6);
  });

  it("every tier's ordinal matches its index in CARD_TIERS", () => {
    CARD_TIERS.forEach((tier, idx) => {
      expect(tierOrdinal(tier)).toBe(idx);
    });
  });
});

describe("TIER_TO_STAGE roll-up", () => {
  it("maps each tier to one of the four coarse stages", () => {
    const allowed = new Set(["New", "Learning", "Reviewing", "Mastered"]);
    Object.values(TIER_TO_STAGE).forEach((stage) => {
      expect(allowed.has(stage)).toBe(true);
    });
  });

  it("rolls tiers up to the same buckets getMemoryStage uses", () => {
    const tiers: CardTier[] = [
      "Seed",
      "Sprout",
      "Seedling",
      "Sapling",
      "Bud",
      "Bloom",
      "Fruit",
    ];
    // Tier index → repetitions value to cross-check against getMemoryStage.
    const repsForTier = [0, 1, 2, 3, 4, 5, 6];
    tiers.forEach((tier, i) => {
      expect(TIER_TO_STAGE[tier]).toBe(getMemoryStage(repsForTier[i]));
    });
  });

  it("every CardTier is present as a key", () => {
    CARD_TIERS.forEach((tier) => {
      expect(TIER_TO_STAGE[tier]).toBeDefined();
    });
  });
});