'use client';

import { Loader2 } from 'lucide-react';

export interface PageLoaderProps {
  /** Short message shown under the spinner */
  message?: string;
  /** If true, fills the viewport (e.g. for auth loading). If false, fits inside a content area. */
  fullScreen?: boolean;
}

export function PageLoader({ message, fullScreen = false }: PageLoaderProps) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-4 text-text-secondary ${
        fullScreen ? 'min-h-screen w-full' : 'min-h-[16rem] w-full py-12'
      }`}
      role="status"
      aria-live="polite"
      aria-label={message ?? 'Loading'}
    >
      {/* Indeterminate top bar */}
      <div
        className="absolute left-0 right-0 top-0 h-0.5 overflow-hidden bg-surface-secondary"
        aria-hidden
      >
        <div
          className="h-full w-1/3 min-w-[8rem] rounded-full bg-accent-primary"
          style={{ animation: 'page-loader-bar 1.2s ease-in-out infinite' }}
        />
      </div>
      <Loader2
        className="h-10 w-10 animate-spin text-accent-primary"
        aria-hidden
      />
      {message && (
        <p className="text-sm font-medium text-text-secondary">{message}</p>
      )}
    </div>
  );
}
