'use client';

import { ReactNode } from 'react';

interface FlipCardProps {
  front: ReactNode;
  back: ReactNode;
  isFlipped: boolean;
  /** If true, clicking the card body triggers onFlip. */
  clickToFlip?: boolean;
  onFlip?: () => void;
}

/**
 * 3-D CSS flip card. Renders two faces; the back is pre-rotated 180°
 * and revealed via a rotateY transform on the container.
 */
export function FlipCard({ front, back, isFlipped, clickToFlip, onFlip }: FlipCardProps) {
  return (
    <div
      className={`relative w-full h-full ${clickToFlip ? 'cursor-pointer' : ''}`}
      style={{ perspective: '1200px' }}
      onClick={clickToFlip && onFlip ? onFlip : undefined}
    >
      <div
        className="absolute inset-0 transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-4">
            Front
          </span>
          <div className="text-lg text-text-primary text-center leading-relaxed max-w-prose">
            {front}
          </div>
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto bg-surface-primary"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-4">
            Back
          </span>
          <div className="text-lg text-text-primary text-center leading-relaxed max-w-prose">
            {back}
          </div>
        </div>
      </div>
    </div>
  );
}
