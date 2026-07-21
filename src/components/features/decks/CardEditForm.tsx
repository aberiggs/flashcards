'use client';

import { Check } from 'lucide-react';

interface CardEditFormProps {
  front: string;
  back: string;
  onFrontChange: (value: string) => void;
  onBackChange: (value: string) => void;
  /** Optional Cancel handler. Renders a secondary button in the footer. */
  onCancel?: () => void;
  /** Primary Save action. */
  onSave?: () => void;
  saveLabel?: string;
  /** Auto-focus the front textarea on mount. */
  autoFocus?: boolean;
  /** Disables the save button and shows a pending label while true. */
  saving?: boolean;
}

/**
 * Shared front/back textarea form used in card create, edit, and generate-review flows.
 */
export function CardEditForm({
  front,
  back,
  onFrontChange,
  onBackChange,
  onCancel,
  onSave,
  saveLabel = 'Save',
  autoFocus = false,
  saving = false,
}: CardEditFormProps) {
  const canSubmit = !front.trim() || !back.trim() || saving;
  const hasFooter = onCancel || onSave;

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
          Front
        </label>
        <textarea
          value={front}
          onChange={(e) => onFrontChange(e.target.value)}
          rows={4}
          autoFocus={autoFocus}
          className="w-full bg-surface-secondary border border-border-primary rounded-lg px-3 py-2 text-base text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary"
          placeholder="Question or prompt"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
          Back
        </label>
        <textarea
          value={back}
          onChange={(e) => onBackChange(e.target.value)}
          rows={4}
          className="w-full bg-surface-secondary border border-border-primary rounded-lg px-3 py-2 text-base text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary"
          placeholder="Answer"
        />
      </div>

      {hasFooter && (
        <div className="flex flex-wrap gap-2 justify-end mt-auto">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border-primary text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={canSubmit}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent-primary text-text-inverse hover:bg-accent-primary-hover transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" aria-hidden />
              {saving ? 'Saving…' : saveLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}