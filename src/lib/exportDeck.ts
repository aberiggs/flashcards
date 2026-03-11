// ── Types ────────────────────────────────────────────────────────────────────

export interface ExportCard {
    front: string;
    back: string;
    efactor?: number;
    repetitions?: number;
    nextReview?: number;
    lastStudied?: number;
}

export interface ExportDeck {
    name: string;
    description?: string;
    cards: ExportCard[];
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

/** RFC 4180 — quote a single field value. */
function csvField(value: string): string {
    // Fields containing commas, newlines, or double-quotes must be quoted.
    if (/[",\r\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function csvRow(fields: string[]): string {
    return fields.map(csvField).join(',');
}

// ── Single-deck CSV ───────────────────────────────────────────────────────────

/** Build a CSV string for one deck (front, back columns). */
export function buildDeckCsv(cards: ExportCard[]): string {
    const header = csvRow(['front', 'back']);
    const rows = cards.map((c) => csvRow([c.front, c.back]));
    return [header, ...rows].join('\r\n');
}

// ── JSON sanitisation ─────────────────────────────────────────────────────────

/** Strip any fields not in the ExportCard contract (e.g. _id, _creationTime, deckId). */
function sanitiseCard(card: ExportCard): ExportCard {
    const out: ExportCard = { front: card.front, back: card.back };
    if (card.efactor !== undefined) out.efactor = card.efactor;
    if (card.repetitions !== undefined) out.repetitions = card.repetitions;
    if (card.nextReview !== undefined) out.nextReview = card.nextReview;
    if (card.lastStudied !== undefined) out.lastStudied = card.lastStudied;
    return out;
}

/** Strip any fields not in the ExportDeck contract (e.g. _id, _creationTime, userId). */
function sanitiseDeck(deck: ExportDeck): ExportDeck {
    const out: ExportDeck = {
        name: deck.name,
        cards: deck.cards.map(sanitiseCard),
    };
    if (deck.description !== undefined) out.description = deck.description;
    return out;
}

// ── Single-deck JSON ──────────────────────────────────────────────────────────

/** Build a JSON string for one deck including full SM-2 state, no internal IDs. */
export function buildDeckJson(deck: ExportDeck): string {
    return JSON.stringify(sanitiseDeck(deck), null, 2);
}

// ── Download trigger ──────────────────────────────────────────────────────────

/** Sanitise a string so it is safe to use as a filename. */
function safeFilename(name: string): string {
    return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'export';
}

/** Trigger a browser file download. */
export function triggerDownload(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    // Clean up after a short delay to let the download start
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

export function downloadDeckCsv(deckName: string, cards: ExportCard[]): void {
    triggerDownload(
        buildDeckCsv(cards),
        `${safeFilename(deckName)}.csv`,
        'text/csv;charset=utf-8;',
    );
}

export function downloadDeckJson(deck: ExportDeck): void {
    triggerDownload(
        buildDeckJson(deck),
        `${safeFilename(deck.name)}.json`,
        'application/json',
    );
}


