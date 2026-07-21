import { describe, it, expect } from "vitest";
import {
  getCardTier,
  tierOrdinal,
  CARD_TIERS,
  TIER_META,
  type CardTier,
} from "@/lib/memoryStage";

describe("getCardTier", () => {
  it.each([
    [-3, "Acorn"],
    [-1, "Acorn"],
    [0, "Acorn"],
    [1, "Sprout"],
    [2, "Sapling"],
    [3, "Tree"],
    [4, "Tree"],
    [5, "Grove"],
    [6, "Grove"],
    [7, "Grove"],
    [8, "Forest"],
    [50, "Forest"],
    [1000, "Forest"],
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
    expect(tierOrdinal("Acorn")).toBe(0);
    expect(tierOrdinal("Sprout")).toBe(1);
    expect(tierOrdinal("Sapling")).toBe(2);
    expect(tierOrdinal("Tree")).toBe(3);
    expect(tierOrdinal("Grove")).toBe(4);
    expect(tierOrdinal("Forest")).toBe(5);
  });

  it("every tier's ordinal matches its index in CARD_TIERS", () => {
    CARD_TIERS.forEach((tier, idx) => {
      expect(tierOrdinal(tier)).toBe(idx);
    });
  });
});

describe("TIER_META", () => {
  it("has one entry per tier, in CARD_TIERS order", () => {
    expect(TIER_META.map((t) => t.tier)).toEqual(CARD_TIERS);
  });

  it("labels match the tier name", () => {
    TIER_META.forEach((t) => {
      expect(t.label).toBe(t.tier);
    });
  });

  it("tokens are the tier's lowercase CSS custom property", () => {
    TIER_META.forEach((t) => {
      expect(t.token).toBe(`var(--tier-${t.tier.toLowerCase()})`);
    });
  });

  it("every tier is represented exactly once", () => {
    const seen = new Set<CardTier>();
    TIER_META.forEach((t) => {
      expect(seen.has(t.tier)).toBe(false);
      seen.add(t.tier);
    });
    expect(seen.size).toBe(CARD_TIERS.length);
  });
});