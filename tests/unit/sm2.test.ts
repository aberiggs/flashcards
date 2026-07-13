import { describe, it, expect } from "vitest";
import {
  computeNextReview,
  qualityFromConfidence,
  type ConfidenceLevel,
} from "@/lib/sm2";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FIXED_NOW = 1_700_000_000_000; // deterministic epoch ms

describe("qualityFromConfidence", () => {
  it.each([
    ["wrong", 0],
    ["close", 2],
    ["hard", 3],
    ["easy", 5],
  ] as [ConfidenceLevel, number][])(
    "maps %s to quality %i",
    (confidence, expected) => {
      expect(qualityFromConfidence(confidence)).toBe(expected);
    }
  );

  it("exhaustively covers every ConfidenceLevel", () => {
    // Compile-time exhaustiveness: if a new variant is added, the switch in
    // qualityFromConfidence would fail to type-check. Here we just confirm the
    // four known values are all mapped without throwing.
    for (const c of ["wrong", "close", "hard", "easy"] as ConfidenceLevel[]) {
      expect(typeof qualityFromConfidence(c)).toBe("number");
    }
  });
});

describe("computeNextReview", () => {
  it("resets repetitions and schedules +1 day when quality < 3 (wrong)", () => {
    const result = computeNextReview({
      efactor: 2.5,
      repetitions: 4,
      quality: 0,
      now: FIXED_NOW,
    });
    expect(result.repetitions).toBe(0);
    expect(result.nextReview).toBe(FIXED_NOW + MS_PER_DAY);
    // E-factor still updates even on a fail (SM-2 rule).
    expect(result.efactor).toBeLessThan(2.5);
  });

  it("resets repetitions and schedules +1 day when quality < 3 (close=2)", () => {
    const result = computeNextReview({
      efactor: 2.5,
      repetitions: 3,
      quality: 2,
      now: FIXED_NOW,
    });
    expect(result.repetitions).toBe(0);
    expect(result.nextReview).toBe(FIXED_NOW + MS_PER_DAY);
  });

  it("first success (quality>=3, reps 0→1) schedules +1 day", () => {
    const result = computeNextReview({
      efactor: 2.5,
      repetitions: 0,
      quality: 3,
      now: FIXED_NOW,
    });
    expect(result.repetitions).toBe(1);
    expect(result.nextReview).toBe(FIXED_NOW + MS_PER_DAY);
  });

  it("second success (reps 1→2) schedules +6 days", () => {
    const result = computeNextReview({
      efactor: 2.5,
      repetitions: 1,
      quality: 5,
      now: FIXED_NOW,
    });
    expect(result.repetitions).toBe(2);
    expect(result.nextReview).toBe(FIXED_NOW + 6 * MS_PER_DAY);
  });

  it("third success (reps 2→3) schedules ceil(6 * EF) days", () => {
    const result = computeNextReview({
      efactor: 2.5,
      repetitions: 2,
      quality: 5,
      now: FIXED_NOW,
    });
    expect(result.repetitions).toBe(3);
    // q=5 → EF' = 2.5 + 0.1 = 2.6 → 6 * 2.6^(3-2) = 15.6 → ceil = 16
    expect(result.efactor).toBeCloseTo(2.6, 5);
    expect(result.nextReview).toBe(FIXED_NOW + 16 * MS_PER_DAY);
  });

  it("later intervals follow I(n) = ceil(6 * EF^(n-2))", () => {
    const result = computeNextReview({
      efactor: 2.6,
      repetitions: 5,
      quality: 5,
      now: FIXED_NOW,
    });
    expect(result.repetitions).toBe(6);
    const expectedDays = Math.ceil(6 * Math.pow(result.efactor, 4));
    expect(result.nextReview).toBe(FIXED_NOW + expectedDays * MS_PER_DAY);
  });

  it("clamps E-factor to 1.3 minimum", () => {
    // Repeated wrongs drive EF down. Start at 1.3 and fail again.
    const result = computeNextReview({
      efactor: 1.3,
      repetitions: 0,
      quality: 0,
      now: FIXED_NOW,
    });
    expect(result.efactor).toBeGreaterThanOrEqual(1.3);
  });

  it("does not go below 1.3 even with very low quality", () => {
    const result = computeNextReview({
      efactor: 1.31,
      repetitions: 0,
      quality: 0,
      now: FIXED_NOW,
    });
    expect(result.efactor).toBe(1.3);
  });

  it("uses Date.now() when now is omitted", () => {
    const before = Date.now();
    const result = computeNextReview({
      efactor: 2.5,
      repetitions: 0,
      quality: 3,
    });
    const after = Date.now();
    // nextReview should fall within a 1-day window measured around now.
    expect(result.nextReview).toBeGreaterThan(before + MS_PER_DAY - 1000);
    expect(result.nextReview).toBeLessThan(after + MS_PER_DAY + 1000);
  });

  it("easy (q=5) increases E-factor by 0.1", () => {
    const result = computeNextReview({
      efactor: 2.5,
      repetitions: 1,
      quality: 5,
      now: FIXED_NOW,
    });
    // EF' = 2.5 + (0.1 - (5-5)*(0.08 + (5-5)*0.02)) = 2.5 + 0.1 = 2.6
    expect(result.efactor).toBeCloseTo(2.6, 5);
  });

  it("hard (q=3) decreases E-factor", () => {
    const result = computeNextReview({
      efactor: 2.5,
      repetitions: 1,
      quality: 3,
      now: FIXED_NOW,
    });
    // EF' = 2.5 + (0.1 - (5-3)(0.08 + (5-3)*0.02)) = 2.5 + (0.1 - 2*0.12) = 2.5 - 0.14
    expect(result.efactor).toBeCloseTo(2.36, 5);
  });
});
