/**
 * Card memory state.
 *
 * Two parallel views over `repetitions`:
 *
 * - {@link MemoryStage} rolls up into the 4 coarse buckets the dashboard
 *   widget and stage filter use (New / Learning / Reviewing / Mastered).
 *   Stable surface — do not rename without updating the widget, the stage
 *   filter, and the route tests.
 *
 * - {@link CardTier} is the finer, user-facing 7-tier progression with plant
 *   metaphor names. One tier per `repetitions` value 0-5, and everything
 *   ≥6 collapses into the final tier. Used for per-card badges and the
 *   viewer info panel so progress feels more granular and rewarding.
 */
export type MemoryStage = 'New' | 'Learning' | 'Reviewing' | 'Mastered';

export type CardTier =
  | 'Seed'
  | 'Sprout'
  | 'Seedling'
  | 'Sapling'
  | 'Bud'
  | 'Bloom'
  | 'Fruit';

export function getMemoryStage(repetitions: number): MemoryStage {
    if (repetitions === 0) return 'New';
    if (repetitions <= 2) return 'Learning';
    if (repetitions <= 5) return 'Reviewing';
    return 'Mastered';
}

/**
 * Tier → parent stage roll-up. Used by the MemoryStages widget so it can keep
 * showing the 4-bucket bar while badges elsewhere show the finer tier.
 */
export const TIER_TO_STAGE: Record<CardTier, MemoryStage> = {
    Seed: 'New',
    Sprout: 'Learning',
    Seedling: 'Learning',
    Sapling: 'Reviewing',
    Bud: 'Reviewing',
    Bloom: 'Reviewing',
    Fruit: 'Mastered',
};

/**
 * Ordered tier list (lowest → highest). Drives badge color and ordinal display.
 */
export const CARD_TIERS: CardTier[] = [
    'Seed',
    'Sprout',
    'Seedling',
    'Sapling',
    'Bud',
    'Bloom',
    'Fruit',
];

export function getCardTier(repetitions: number): CardTier {
    if (repetitions <= 0) return 'Seed';
    if (repetitions === 1) return 'Sprout';
    if (repetitions === 2) return 'Seedling';
    if (repetitions === 3) return 'Sapling';
    if (repetitions === 4) return 'Bud';
    if (repetitions === 5) return 'Bloom';
    return 'Fruit';
}

/**
 * Zero-based ordinal of a tier in {@link CARD_TIERS}. Handy for "level 4/7"
 * style badges.
 */
export function tierOrdinal(tier: CardTier): number {
    return CARD_TIERS.indexOf(tier);
}