'use client';

import { Search, X, Filter, CalendarClock, GraduationCap, ArrowDownUp } from 'lucide-react';
import { Dropdown, type DropdownOption } from '@/components/ui/Dropdown';
import {
  type CardSortKey,
  type DueFilter,
  type StageFilter,
  isFilterActive,
} from '@/lib/filterDeckCards';

// ── Props ────────────────────────────────────────────────────────────────────

export interface CardBrowserFiltersProps {
  query: string;
  onQueryChange: (v: string) => void;
  stageFilter: StageFilter;
  onStageFilterChange: (v: StageFilter) => void;
  dueFilter: DueFilter;
  onDueFilterChange: (v: DueFilter) => void;
  sortKey: CardSortKey;
  onSortKeyChange: (v: CardSortKey) => void;
  totalCount: number;
  filteredCount: number;
  onClear: () => void;
}

// ── Option tables ───────────────────────────────────────────────────────────

const STAGE_OPTIONS: DropdownOption[] = [
  { value: 'all', label: 'All stages' },
  { value: 'New', label: 'New' },
  { value: 'Learning', label: 'Learning' },
  { value: 'Reviewing', label: 'Reviewing' },
  { value: 'Mastered', label: 'Mastered' },
];

const DUE_OPTIONS: DropdownOption[] = [
  { value: 'all', label: 'Any due status' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'upcoming', label: 'Upcoming' },
];

const SORT_OPTIONS: DropdownOption[] = [
  { value: 'oldest', label: 'Oldest first' },
  { value: 'newest', label: 'Newest first' },
  { value: 'due', label: 'Due first' },
  { value: 'stage', label: 'Stage (low → high)' },
];

// ── Component ────────────────────────────────────────────────────────────────

export function CardBrowserFilters({
  query,
  onQueryChange,
  stageFilter,
  onStageFilterChange,
  dueFilter,
  onDueFilterChange,
  sortKey,
  onSortKeyChange,
  totalCount,
  filteredCount,
  onClear,
}: CardBrowserFiltersProps) {
  const active = isFilterActive({ query, stageFilter, dueFilter, sortKey });
  const filtered = filteredCount < totalCount;

  return (
    <div className="rounded-xl border border-border-primary bg-surface-primary shadow-sm">
      {/* ── Row 1: search + count ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:px-5 sm:py-4 border-b border-border-primary">
        <div className="relative flex-1 min-w-0">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-tertiary pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search cards in this deck…"
            aria-label="Search cards in this deck"
            className="w-full min-h-[40px] pl-9 pr-9 rounded-lg border border-border-primary bg-surface-secondary text-sm text-text-primary
                       placeholder:text-text-tertiary transition-colors
                       hover:border-border-secondary
                       focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center size-7
                         rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors cursor-pointer
                         focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <span
            className="text-xs tabular-nums text-text-tertiary"
            aria-live="polite"
          >
            {filtered ? (
              <>
                <span className="font-medium text-text-secondary">{filteredCount}</span>
                <span className="text-text-tertiary"> of {totalCount}</span>
              </>
            ) : (
              <>
                <span className="font-medium text-text-secondary">{totalCount}</span>{' '}
                {totalCount === 1 ? 'card' : 'cards'}
              </>
            )}
          </span>

          {active && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                         text-text-secondary border border-border-primary bg-surface-secondary
                         hover:bg-surface-tertiary hover:text-text-primary transition-colors cursor-pointer
                         focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <X className="size-3.5" aria-hidden />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Row 2: filter chips ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-3 sm:px-5 sm:py-3 bg-surface-secondary/50">
        <span
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-tertiary shrink-0 pr-1"
          aria-hidden
        >
          <Filter className="size-3.5" />
          Filter
        </span>

        <Dropdown
          options={STAGE_OPTIONS}
          value={stageFilter}
          onValueChange={(v) => onStageFilterChange(v as StageFilter)}
          ariaLabel="Filter by memory stage"
          leadingIcon={<GraduationCap className="size-4" />}
          variant="compact"
          className="min-w-[150px] flex-1 sm:flex-none sm:w-auto"
        />

        <Dropdown
          options={DUE_OPTIONS}
          value={dueFilter}
          onValueChange={(v) => onDueFilterChange(v as DueFilter)}
          ariaLabel="Filter by due status"
          leadingIcon={<CalendarClock className="size-4" />}
          variant="compact"
          className="min-w-[150px] flex-1 sm:flex-none sm:w-auto"
        />

        <Dropdown
          options={SORT_OPTIONS}
          value={sortKey}
          onValueChange={(v) => onSortKeyChange(v as CardSortKey)}
          ariaLabel="Sort cards"
          leadingIcon={<ArrowDownUp className="size-4" />}
          variant="compact"
          className="min-w-[150px] flex-1 sm:flex-none sm:w-auto sm:ml-auto"
        />
      </div>
    </div>
  );
}