'use client';

import { CARD_TIERS, tierOrdinal, type CardTier } from '@/lib/memoryStage';

/**
 * CSS token name for each tier. Kept here so callers don't have to map
 * tier → token — the badge and any future consumer just look it up.
 */
const TIER_TOKEN: Record<CardTier, string> = {
  Seed: 'var(--tier-seed)',
  Sprout: 'var(--tier-sprout)',
  Seedling: 'var(--tier-seedling)',
  Sapling: 'var(--tier-sapling)',
  Bud: 'var(--tier-bud)',
  Bloom: 'var(--tier-bloom)',
  Fruit: 'var(--tier-fruit)',
};

const TOTAL_TIERS = CARD_TIERS.length;

export interface TierBadgeProps {
  tier: CardTier;
  /**
   * Visual variant:
   * - `'dot'`    — small colored dot + ordinal, for dense surfaces like
   *                the card grid. (default)
   * - `'chip'`   — rounded chip with the tier name, for detail views like
   *                the card viewer info panel.
   */
  variant?: 'dot' | 'chip';
  /** Optional extra className for the root element. */
  className?: string;
}

/**
 * Compact tier badge. Shows a tier-colored dot (or chip) plus the tier's
 * 1-based ordinal out of 7 — e.g. "• 4/7" — so the user can gauge progress
 * at a glance without needing to memorize the plant metaphor.
 */
export function TierBadge({ tier, variant = 'dot', className }: TierBadgeProps) {
  const color = TIER_TOKEN[tier];
  const level = tierOrdinal(tier) + 1;

  if (variant === 'chip') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-border-primary bg-surface-secondary px-2.5 py-1 text-xs font-medium text-text-primary ${className ?? ''}`}
      >
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span>{tier}</span>
        <span className="text-text-tertiary tabular-nums">
          {level}/{TOTAL_TIERS}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium text-text-tertiary tabular-nums ${className ?? ''}`}
      title={`${tier} — level ${level} of ${TOTAL_TIERS}`}
    >
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="text-text-secondary">{level}/{TOTAL_TIERS}</span>
      <span className="sr-only">{tier}</span>
    </span>
  );
}