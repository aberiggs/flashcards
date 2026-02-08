/**
 * SM-2 spaced repetition algorithm implementation.
 * Quality scale: 0–5. Options: Wrong=0, Close=2, Hard=3, Easy=5.
 * If q < 3: reset repetitions, next interval = 1 day.
 * E-Factor: EF' = EF + (0.1 − (5−q)(0.08 + (5−q)×0.02)), min 1.3.
 * Intervals: I(1) = 1 day, I(2) = 6 days, I(n) = I(n−1) × EF for n > 2.
 */

export type ConfidenceLevel = "wrong" | "close" | "hard" | "easy";

const MIN_EFACTOR = 1.3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Map confidence button to SM-2 quality (0–5).
 */
export function qualityFromConfidence(confidence: ConfidenceLevel): number {
  switch (confidence) {
    case "wrong":
      return 0;
    case "close":
      return 2;
    case "hard":
      return 3;
    case "easy":
      return 5;
  }
}

/**
 * Compute updated SRS state and next review timestamp from a review.
 */
export function computeNextReview(params: {
  efactor: number;
  repetitions: number;
  quality: number;
  now?: number;
}): { efactor: number; repetitions: number; nextReview: number } {
  const { quality, now = Date.now() } = params;
  const { efactor, repetitions } = params;

  // Update E-Factor (always, per SM-2)
  const newEfactor = Math.max(
    MIN_EFACTOR,
    efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  if (quality < 3) {
    // Reset repetitions, next interval = 1 day
    return {
      efactor: newEfactor,
      repetitions: 0,
      nextReview: now + MS_PER_DAY,
    };
  }

  // Advance interval
  const newRepetitions = repetitions + 1;
  let intervalDays: number;
  if (newRepetitions === 1) {
    intervalDays = 1;
  } else if (newRepetitions === 2) {
    intervalDays = 6;
  } else {
    intervalDays = Math.ceil(6 * Math.pow(newEfactor, newRepetitions - 2));
  }

  return {
    efactor: newEfactor,
    repetitions: newRepetitions,
    nextReview: now + intervalDays * MS_PER_DAY,
  };
}
