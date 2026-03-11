'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Search, Layers, CreditCard, X } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface DeckResult {
  _id: string;
  name: string;
  description?: string;
  cardCount: number;
}

interface CardResult {
  _id: string;
  front: string;
  deckId: string;
  deckName: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + '…';
}

// ── SearchDropdown ────────────────────────────────────────────────────────────

interface SearchDropdownProps {
  query: string;
  decks: DeckResult[];
  cards: CardResult[];
  focusedIndex: number;
  totalItems: number;
  onNavigate: (href: string) => void;
  listRef: React.RefObject<HTMLUListElement | null>;
}

function SearchDropdown({
  query,
  decks,
  cards,
  focusedIndex,
  totalItems,
  onNavigate,
  listRef,
}: SearchDropdownProps) {
  const hasResults = decks.length > 0 || cards.length > 0;

  // Scroll focused item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[role="option"]');
    const focused = items[focusedIndex] as HTMLElement | undefined;
    focused?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex, listRef]);

  if (!hasResults) {
    return (
      <div className="px-4 py-6 text-center text-sm text-text-tertiary">
        No results for &ldquo;{query}&rdquo;
      </div>
    );
  }

  let globalIndex = 0;

  return (
      <ul
      ref={listRef}
      id="search-listbox"
      role="listbox"
      aria-label="Search results"
      className="py-2 max-h-[min(480px,70vh)] overflow-y-auto"
    >
      {decks.length > 0 && (
        <>
          <li className="px-3 pt-1 pb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Decks
            </span>
          </li>
          {decks.map((deck) => {
            const idx = globalIndex++;
            const isFocused = idx === focusedIndex;
            return (
              <li key={deck._id} role="option" aria-selected={isFocused}>
                <button
                  type="button"
                  onClick={() => onNavigate(`/decks/${deck._id}`)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    isFocused
                      ? 'bg-accent-primary/10 text-text-primary'
                      : 'text-text-primary hover:bg-surface-secondary'
                  }`}
                >
                  <Layers
                    className="w-4 h-4 shrink-0 text-accent-primary"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{deck.name}</p>
                    <p className="text-xs text-text-tertiary">
                      {deck.cardCount} card{deck.cardCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </>
      )}

      {cards.length > 0 && (
        <>
          {decks.length > 0 && (
            <li
              className="mx-3 my-1 border-t border-border-primary"
              aria-hidden
            />
          )}
          <li className="px-3 pt-1 pb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Cards
            </span>
          </li>
          {cards.map((card) => {
            const idx = globalIndex++;
            const isFocused = idx === focusedIndex;
            return (
              <li key={card._id} role="option" aria-selected={isFocused}>
                <button
                  type="button"
                  onClick={() => onNavigate(`/decks/${card.deckId}`)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    isFocused
                      ? 'bg-accent-primary/10 text-text-primary'
                      : 'text-text-primary hover:bg-surface-secondary'
                  }`}
                >
                  <CreditCard
                    className="w-4 h-4 shrink-0 text-text-tertiary"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {truncate(card.front, 72)}
                    </p>
                    <p className="text-xs text-text-tertiary truncate">
                      in {card.deckName}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </>
      )}
      {/* Invisible sentinel so aria-activedescendant count aligns */}
      <li aria-hidden className="sr-only" data-total={totalItems} />
    </ul>
  );
}

// ── SearchBar (main export) ───────────────────────────────────────────────────

export function SearchBar() {
  const router = useRouter();

  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  // Mobile: collapsed to icon by default, expanded on tap
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const debouncedQuery = useDebounce(inputValue.trim(), 300);

  // Only run query when we have ≥2 chars — skip when empty/short
  const shouldSearch = debouncedQuery.length >= 2;
  const results = useQuery(
    api.search.search,
    shouldSearch ? { query: debouncedQuery } : 'skip'
  );

  const decks: DeckResult[] = results?.decks ?? [];
  const cards: CardResult[] = results?.cards ?? [];
  const totalItems = decks.length + cards.length;

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Open/close dropdown based on query + results
  useEffect(() => {
    if (shouldSearch && results !== undefined) {
      setIsOpen(true);
      setFocusedIndex(-1);
    } else if (!shouldSearch) {
      setIsOpen(false);
      setFocusedIndex(-1);
    }
  }, [shouldSearch, results]);

  // Cmd/Ctrl+K → focus the input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setMobileExpanded(true);
        // Defer so the input is visible when we focus it
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside → close
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
  }, []);

  const clear = useCallback(() => {
    setInputValue('');
    close();
    inputRef.current?.focus();
  }, [close]);

  const navigate = useCallback(
    (href: string) => {
      close();
      setInputValue('');
      setMobileExpanded(false);
      router.push(href);
    },
    [close, router]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close();
        if (mobileExpanded && !inputValue) setMobileExpanded(false);
        break;

      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, totalItems - 1));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, -1));
        break;

      case 'Enter': {
        e.preventDefault();
        if (focusedIndex < 0) break;
        const href =
          focusedIndex < decks.length
            ? `/decks/${decks[focusedIndex]._id}`
            : `/decks/${cards[focusedIndex - decks.length].deckId}`;
        navigate(href);
        break;
      }
    }
  };

  // Shared input element
  const inputEl = (
    <div className="relative flex items-center">
      <div className="relative flex items-center w-full">
        <Search
          className="absolute left-2.5 w-4 h-4 text-text-tertiary pointer-events-none"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="search-listbox"
          aria-autocomplete="list"
          aria-label="Search decks and cards"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (shouldSearch && results !== undefined) setIsOpen(true);
          }}
          placeholder="Search…"
          className="w-full pl-8 pr-7 py-1.5 rounded-lg text-sm bg-surface-secondary border border-border-primary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-colors"
        />
        {inputValue && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-2 text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary rounded"
          >
            <X className="w-3.5 h-3.5" aria-hidden />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-surface-primary border border-border-primary rounded-xl shadow-lg overflow-hidden animate-fade-in-up">
          {results === undefined ? (
            <div className="px-4 py-4 text-center text-sm text-text-tertiary">
              Searching…
            </div>
          ) : (
            <SearchDropdown
              query={debouncedQuery}
              decks={decks}
              cards={cards}
              focusedIndex={focusedIndex}
              totalItems={totalItems}
              onNavigate={navigate}
              listRef={listRef}
            />
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: always-visible search bar */}
      <div className="hidden md:block w-56 lg:w-72 relative" ref={containerRef}>
        {inputEl}
      </div>

      {/* Mobile: icon that expands to full-width bar */}
      <div className="md:hidden">
        {mobileExpanded ? (
          <div className="fixed inset-x-0 top-0 z-[55] px-3 h-14 flex items-center gap-2 bg-surface-primary border-b border-border-primary animate-fade-in">
            <div className="flex-1 relative" ref={containerRef}>
              {inputEl}
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileExpanded(false);
                setInputValue('');
                close();
              }}
              aria-label="Close search"
              className="shrink-0 flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMobileExpanded(true);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            aria-label="Open search"
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            <Search className="w-5 h-5" aria-hidden />
          </button>
        )}
      </div>
    </>
  );
}
