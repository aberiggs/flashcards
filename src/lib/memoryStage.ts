/**
 * Card memory state.
 *
 * Two parallel views over `repetitions`:
 *
 * - {@link MemoryStage} rolls up into the 4 coarse buckets the stage filter
 *   uses (New / Learning / Reviewing / Mastered). Stable surface — do not
 *   rename without updating the filter and route tests.
 *
 * - {@link CardTier} is the finer, user-facing 6-tier "forest" progression
 *   (Acorn → Forest). Grouped by SM-2 reality: the early tiers change per
 *   review because intervals jump fast there (1d → 6d → 15d), while the
 *   mature tiers each span multiple reps because by then intervals are
 *   weeks/months/years — one good review shouldn't bump a Tree straight to
 *   a Forest. Used for per-card badges and the dashboard widget so progress
 *   feels granular and rewarding without misrepresenting how far along a
 *   card actually is.
 *
 * Repetition → tier boundaries (and the matching coarse stage):
 *   0      → Acorn    (New)
 *   1      → Sprout   (Learning)
 *   2      → Sapling  (Learning)
 *   3–4    → Tree     (Reviewing)
 *   5–7    → Grove    (Reviewing)
 *   8+     → Forest   (Mastered)
 */
export type MemoryStage = 'New' | 'Learning' | 'Reviewing' | 'Mastered';

export type CardTier =
  | 'Acorn'
  | 'Sprout'
  | 'Sapling'
  | 'Tree'
  | 'Grove'
  | 'Forest';

export function getMemoryStage(repetitions: number): MemoryStage {
    if (repetitions <= 0) return 'New';
    if (repetitions <= 2) return 'Learning';
    if (repetitions <= 7) return 'Reviewing';
    return 'Mastered';
}

/**
 * Tier → parent stage roll-up. Used by the stage filter so it can map a
 * fine tier back to its coarse bucket.
 */
export const TIER_TO_STAGE: Record<CardTier, MemoryStage> = {
    Acorn: 'New',
    Sprout: 'Learning',
    Sapling: 'Learning',
    Tree: 'Reviewing',
    Grove: 'Reviewing',
    Forest: 'Mastered',
};

/**
 * Ordered tier list (lowest → highest). Drives badge color and widget order.
 */
export const CARD_TIERS: CardTier[] = [
    'Acorn',
    'Sprout',
    'Sapling',
    'Tree',
    'Grove',
    'Forest',
];

export function getCardTier(repetitions: number): CardTier {
    if (repetitions <= 0) return 'Acorn';
    if (repetitions === 1) return 'Sprout';
    if (repetitions === 2) return 'Sapling';
    if (repetitions <= 4) return 'Tree';
    if (repetitions <= 7) return 'Grove';
    return 'Forest';
}

/**
 * Zero-based ordinal of a tier in {@link CARD_TIERS}. Handy when a consumer
 * needs the rank rather than the name.
 */
export function tierOrdinal(tier: CardTier): number {
    return CARD_TIERS.indexOf(tier);
}