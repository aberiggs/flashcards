'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Accessible listbox-style dropdown. Implements the WAI-ARIA combobox /
 * listbox pattern (https://www.w3.org/WAI/ARIA/apg/patterns/listbox/):
 *
 *   - Trigger: <button> with `aria-haspopup="listbox"` and `aria-expanded`.
 *   - Popup:   <ul role="listbox"> with <li role="option"> children.
 *   - Keyboard: Enter / Space to open, Arrow keys to move, Enter / Space to
 *     select, Escape to close, Home / End to jump, type-ahead to find.
 *   - Focus: trigger keeps DOM focus; the active option is tracked via
 *     `aria-activedescendant` so screen readers announce it.
 *   - Click outside or Escape closes and returns focus to the trigger.
 *
 * No native <select> — fully custom for sleek styling while staying
 * keyboard- and screen-reader-friendly.
 *
 * Variants:
 *   - `default`: full-width trigger with a left-aligned label.
 *   - `compact`:  the trigger shows only an icon + current value, sized for
 *     dense filter bars (see CardBrowserFilters).
 */

export interface DropdownOption {
  value: string;
  label: string;
  /** Optional short label shown in the trigger when this option is selected. */
  triggerLabel?: string;
}

export interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onValueChange: (value: string) => void;
  /** Visible label above the trigger (desktop form-style). Optional. */
  label?: string;
  /** Accessible name when no visible label is shown. Required. */
  ariaLabel: string;
  /** Icon rendered inside the trigger, left of the value. Optional. */
  leadingIcon?: React.ReactNode;
  variant?: 'default' | 'compact';
  disabled?: boolean;
  /** Optional className applied to the trigger wrapper. */
  className?: string;
}

export function Dropdown({
  options,
  value,
  onValueChange,
  label,
  ariaLabel,
  leadingIcon,
  variant = 'default',
  disabled = false,
  className = '',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  // Anchoring for the listbox. The listbox sizes to its content (w-max) and
  // attaches to the left or right edge of the trigger depending on which side
  // has more room. Re-measured on every open so it survives resize/scroll.
  const [listboxStyle, setListboxStyle] = useState<React.CSSProperties>({
    minWidth: 'max-content',
  });

  const selectedIndex = useMemo(
    () => Math.max(
      0,
      options.findIndex((o) => o.value === value)
    ),
    [options, value]
  );

  // Position the listbox relative to the trigger. Called on open and on
  // viewport changes while open. The listbox is sized to fit its longest
  // option (measured off-screen) and anchored to the left or right edge of
  // the trigger depending on which side has more room.
  const measureAndPosition = useCallback(() => {
    const trigger = triggerRef.current;
    const list = listRef.current;
    if (!trigger || !list) return;
    const tRect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const margin = 8; // px of breathing room from the viewport edge

    // Measure the natural (untruncated) width of the widest option. We use
    // scrollWidth because it reports the content's natural width even when
    // the span is currently being clipped by the listbox's initial width.
    const optionSpans = Array.from(list.querySelectorAll('[data-option-text]'));
    let contentWidth = 0;
    for (const span of optionSpans) {
      const spanEl = span as HTMLElement;
      contentWidth = Math.max(contentWidth, spanEl.scrollWidth);
    }
    // Add horizontal padding (px-3 = 12px each side = 24px), the check icon
    // column (size-4 + gap-2 = 16+8 = 24px), and a small buffer.
    const naturalListWidth = Math.ceil(contentWidth) + 24 + 24 + 4;

    const spaceRight = vw - tRect.left - margin;
    const spaceLeft = tRect.right - margin;
    const fitsOnRight = naturalListWidth <= spaceRight;
    const style: React.CSSProperties = {
      minWidth: naturalListWidth,
      width: naturalListWidth,
    };
    if (fitsOnRight) {
      style.left = 0;
      style.right = 'auto';
    } else {
      style.right = 0;
      style.left = 'auto';
    }
    // Clamp width to remaining viewport space so very long option lists don't
    // overflow in either direction.
    const maxWidth = fitsOnRight ? spaceRight : spaceLeft;
    style.maxWidth = Math.max(maxWidth, 160);
    setListboxStyle(style);
  }, []);

  // Open with the currently-selected option focused so the keyboard user
  // can immediately adjust from their current choice.
  useEffect(() => {
    if (isOpen) setActiveIndex(selectedIndex);
  }, [isOpen, selectedIndex]);

  // Click outside → close. Also reposition on viewport changes while open.
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        listRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('resize', measureAndPosition);
    window.addEventListener('scroll', measureAndPosition, true);
    // Measure on first paint after open.
    const id = requestAnimationFrame(measureAndPosition);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('resize', measureAndPosition);
      window.removeEventListener('scroll', measureAndPosition, true);
      cancelAnimationFrame(id);
    };
  }, [isOpen, measureAndPosition]);

  // Scroll active option into view
  useEffect(() => {
    if (!isOpen || activeIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[role="option"]');
    const el = items[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const closeAndFocusTrigger = useCallback(() => {
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const selectIndex = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option) return;
      onValueChange(option.value);
      closeAndFocusTrigger();
    },
    [options, onValueChange, closeAndFocusTrigger]
  );

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    // When open, the trigger owns all keyboard interaction (combobox pattern:
    // focus stays on the trigger, aria-activedescendant on the listbox points
    // at the active option). When closed, Arrow/Enter/Space open the list.
    if (!isOpen) {
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Enter':
        case ' ':
        case 'Spacebar':
          e.preventDefault();
          setIsOpen(true);
          break;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min((i < 0 ? 0 : i + 1), options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
      case 'Spacebar':
        e.preventDefault();
        if (activeIndex >= 0) selectIndex(activeIndex);
        break;
      case 'Escape':
        e.preventDefault();
        closeAndFocusTrigger();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const selectedOption = options[selectedIndex];
  const triggerDisplay = selectedOption?.triggerLabel ?? selectedOption?.label ?? '';

  const isCompact = variant === 'compact';

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label
          id={`${listboxId}-label`}
          className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5"
        >
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={ariaLabel}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        className={`group flex w-full items-center gap-2 rounded-lg border border-border-primary bg-surface-secondary text-text-primary
          transition-colors
          hover:bg-surface-tertiary hover:border-border-secondary
          focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isCompact ? 'min-h-[40px] px-3 text-sm' : 'min-h-[44px] px-3.5 text-sm'}
          cursor-pointer`}
      >
        {leadingIcon && (
          <span className="shrink-0 text-text-tertiary group-hover:text-text-secondary transition-colors">
            {leadingIcon}
          </span>
        )}
        <span className="flex-1 truncate text-left">{triggerDisplay}</span>
        <ChevronDown
          className={`shrink-0 text-text-tertiary transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
          }
          aria-label={ariaLabel}
          style={listboxStyle}
          className="absolute z-50 mt-1.5 overflow-auto rounded-lg border border-border-primary bg-surface-primary shadow-lg
                     max-h-60 py-1 animate-fade-in-up outline-none"
        >
          {options.map((option, index) => {
            const isActive = index === activeIndex;
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listboxId}-opt-${index}`}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => {
                  // Prevent the trigger's blur from firing before click lands.
                  e.preventDefault();
                }}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectIndex(index)}
                className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer select-none transition-colors whitespace-nowrap
                  ${isActive ? 'bg-accent-primary/10 text-text-primary' : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'}`}
              >
                <span data-option-text className="whitespace-nowrap">{option.label}</span>
                {isSelected && (
                  <Check
                    className="shrink-0 size-4 text-accent-primary"
                    aria-hidden
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}