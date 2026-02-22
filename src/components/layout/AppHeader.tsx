'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layers, ChevronLeft, Settings, LogOut, Menu, X, Home, BookOpen } from 'lucide-react';
import { useAuthActions } from '@convex-dev/auth/react';

const NAV_LINKS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/decks', label: 'Decks', icon: BookOpen },
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  // Close drawer on Escape key
  useEffect(() => {
    if (!drawerOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [drawerOpen]);

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b border-border-primary bg-surface-primary/95 backdrop-blur-md supports-[backdrop-filter]:bg-surface-primary/90"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            {/* Left: brand + nav or back + title */}
            <div className="flex items-center gap-4 sm:gap-6 min-w-0">
              {backHref ? (
                <>
                  <Link
                    href={backHref}
                    className="flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors shrink-0 min-h-[44px] min-w-[44px] justify-center sm:justify-start"
                    aria-label={`Back to ${backLabel ?? 'previous'}`}
                  >
                    <ChevronLeft className="w-5 h-5" aria-hidden />
                    <span className="hidden sm:inline">{backLabel ?? 'Back'}</span>
                  </Link>
                  {title && (
                    <span className="text-base sm:text-lg font-semibold text-text-primary truncate" title={title}>
                      {title}
                    </span>
                  )}
                </>
              ) : (
                <>
                  {/* Hamburger button — visible below md */}
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] -ml-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="w-5 h-5" aria-hidden />
                  </button>

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
                          className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
                className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary"
                title="Options & Settings"
                aria-label="Options & Settings"
              >
                <Settings className="w-5 h-5" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="hidden sm:flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-5 h-5" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile slide-out drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          {/* Drawer panel */}
          <div
            ref={drawerRef}
            className="absolute top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-surface-primary border-r border-border-primary shadow-lg flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-border-primary shrink-0">
              <Link
                href="/"
                className="flex items-center gap-2 text-text-primary"
                onClick={() => setDrawerOpen(false)}
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-primary/15 text-accent-primary">
                  <Layers className="w-4 h-4" aria-hidden />
                </span>
                <span className="font-semibold text-lg tracking-tight">Flashcards</span>
              </Link>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" aria-hidden />
              </button>
            </div>

            {/* Drawer nav links */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Mobile navigation">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                const isActive =
                  href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-accent-primary bg-accent-primary/10'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" aria-hidden />
                    {label}
                  </Link>
                );
              })}
              <Link
                href="/options"
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/options'
                    ? 'text-accent-primary bg-accent-primary/10'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                }`}
              >
                <Settings className="w-5 h-5 shrink-0" aria-hidden />
                Settings
              </Link>
            </nav>

            {/* Drawer footer */}
            <div className="px-3 py-4 border-t border-border-primary shrink-0">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  void signOut();
                }}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
              >
                <LogOut className="w-5 h-5 shrink-0" aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
