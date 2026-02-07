'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layers, ChevronLeft, Settings, LogOut } from 'lucide-react';
import { useAuthActions } from '@convex-dev/auth/react';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/decks', label: 'Decks' },
] as const;

export interface AppHeaderProps {
  /** Optional page title (e.g. "My Decks", "Options") */
  title?: string;
  /** Show a back link; use for sub-pages like study/edit */
  backHref?: string;
  /** Label for the back link (e.g. "Decks", "Home") */
  backLabel?: string;
}

export function AppHeader({ title, backHref, backLabel }: AppHeaderProps) {
  const pathname = usePathname();
  const { signOut } = useAuthActions();

  return (
    <header
      className="sticky top-0 z-50 border-b border-border-primary bg-surface-primary/95 backdrop-blur-md supports-[backdrop-filter]:bg-surface-primary/90"
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Left: brand + nav or back + title */}
          <div className="flex items-center gap-6 min-w-0">
            {backHref ? (
              <>
                <Link
                  href={backHref}
                  className="flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors shrink-0"
                  aria-label={`Back to ${backLabel ?? 'previous'}`}
                >
                  <ChevronLeft className="w-5 h-5" aria-hidden />
                  <span className="hidden sm:inline">{backLabel ?? 'Back'}</span>
                </Link>
                {title && (
                  <span className="text-lg font-semibold text-text-primary truncate" title={title}>
                    {title}
                  </span>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/"
                  className="flex items-center gap-2 shrink-0 text-text-primary hover:opacity-90 transition-opacity"
                  aria-label="Flashcards – Home"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-primary/15 text-accent-primary">
                    <Layers className="w-4 h-4" aria-hidden />
                  </span>
                  <span className="font-semibold text-lg tracking-tight hidden sm:block">
                    Flashcards
                  </span>
                </Link>
                <nav className="hidden md:flex items-center gap-1" aria-label="Main">
                  {NAV_LINKS.map(({ href, label }) => {
                    const isActive =
                      href === '/'
                        ? pathname === '/'
                        : pathname.startsWith(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? 'text-accent-primary bg-accent-primary/10'
                            : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                        }`}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </nav>
              </>
            )}
          </div>

          {/* Right: settings, sign out */}
          <div className="flex items-center gap-1 shrink-0">
            <Link
              href="/options"
              className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
              title="Options & Settings"
              aria-label="Options & Settings"
            >
              <Settings className="w-5 h-5" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
