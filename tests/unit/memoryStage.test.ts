import { describe, it, expect } from "vitest";
import { getMemoryStage } from "@/lib/memoryStage";

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
