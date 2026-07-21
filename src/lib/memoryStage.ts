/**
 * Card memory state — the single source of truth for card progression.
 *
 * Every consumer in the app (badges, dashboard widget, stage filter, stats
 * backend) reads from this module. There is no longer a parallel "coarse
 * 4-bucket" stage type — the 6 tiers ARE the stages.
 *
 * Tier boundaries group by SM-2 reality: the early tiers change per review
 * because intervals jump fast there (1d → 6d → 15d), while the mature tiers
 * each span multiple reps because by then intervals are weeks/months/years —
 * one good review shouldn't bump a Tree straight to a Forest.
 *
 * Repetition → tier:
 *   0      → Acorn
 *   1      → Sprout
 *   2      → Sapling
 *   3–4    → Tree
 *   5–7    → Grove
 *   8+     → Forest
 */

export type CardTier =
  | 'Acorn'
  | 'Sprout'
  | 'Sapling'
  | 'Tree'
  | 'Grove'
  | 'Forest';

/**
 * Ordered tier list (lowest → highest). Drives badge order, the dashboard
 * widget, and the stage-filter dropdown.
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

/**
 * Shared per-tier metadata. The single source of truth for tier label and
 * CSS color token — `TierBadge`, `MemoryStagesWidget`, and the stage-filter
 * dropdown all read from this table so they can never drift apart.
 */
export interface TierMeta {
    tier: CardTier;
    /** Display label (same as the tier name, but explicit for the table). */
    label: string;
    /** CSS custom property name for the tier color, e.g. `var(--tier-acorn)`. */
    token: string;
}

export const TIER_META: TierMeta[] = CARD_TIERS.map((tier) => ({
    tier,
    label: tier,
    token: `var(--tier-${tier.toLowerCase()})`,
}));