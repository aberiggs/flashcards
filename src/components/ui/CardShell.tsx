'use client';

import { ReactNode } from 'react';

interface CardShellProps {
  /** Rendered in the fixed top bar. */
  header: ReactNode;
  /** Fills the flexible middle area. */
  children: ReactNode;
  /** Rendered in the fixed bottom bar. */
  footer: ReactNode;
  /** Called when the backdrop is clicked. */
  onBackdropClick?: () => void;
}

/**
 * Full-screen overlay shell shared by card viewer and generate-review UIs.
 * Provides the backdrop, centred card frame, and three layout slots.
 */
export function CardShell({ header, children, footer, onBackdropClick }: CardShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
        onClick={onBackdropClick}
        aria-hidden
      />

      {/* Card frame */}
      <div className="relative w-full mx-4 max-w-xl">
        <div className="h-[80vh] max-h-[600px] flex flex-col bg-surface-primary border border-border-primary rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border-primary">
            {header}
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0">
            {children}
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-border-primary">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}
