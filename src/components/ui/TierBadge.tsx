'use client';

import { type CardTier } from '@/lib/memoryStage';

/**
 * CSS token name for each tier. Kept here so callers don't have to map
 * tier → token — the badge and any future consumer just look it up.
 */
const TIER_TOKEN: Record<CardTier, string> = {
  Acorn: 'var(--tier-acorn)',
  Sprout: 'var(--tier-sprout)',
  Sapling: 'var(--tier-sapling)',
  Tree: 'var(--tier-tree)',
  Grove: 'var(--tier-grove)',
  Forest: 'var(--tier-forest)',
};

export interface TierBadgeProps {
  tier: CardTier;
  /**
   * Visual variant:
   * - `'dot'`  — colored dot + tier name, for dense surfaces like the card
   *              grid. (default)
   * - `'chip'` — rounded chip with the tier name, for detail views like the
   *              card viewer info panel.
   */
  variant?: 'dot' | 'chip';
  /** Optional extra className for the root element. */
  className?: string;
}

/**
 * Tier badge. The dot variant shows a visible colored dot followed by the
 * tier name; the chip variant wraps the same in a bordered pill. The
 * numeric "x/N" ordinal was removed — the name itself is the ranking.
 */
export function TierBadge({ tier, variant = 'dot', className }: TierBadgeProps) {
  const color = TIER_TOKEN[tier];

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
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium text-text-secondary ${className ?? ''}`}
      title={tier}
    >
      <span
        className="size-2.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="text-text-secondary">{tier}</span>
    </span>
  );
}