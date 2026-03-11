// ── Types ────────────────────────────────────────────────────────────────────

export interface ParsedCard {
    front: string;
    back: string;
    efactor?: number;
    repetitions?: number;
    nextReview?: number;
    lastStudied?: number;
}

export interface ParseResult {
    cards: ParsedCard[];
    /** Suggested deck name derived from filename or JSON metadata. */
    suggestedName: string;
    description?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/** Column header synonyms considered "front" */
const FRONT_HEADERS = new Set(['front', 'question', 'q', 'term', 'word']);
/** Column header synonyms considered "back" */
const BACK_HEADERS = new Set(['back', 'answer', 'a', 'definition', 'meaning']);

// ── CSV parser ────────────────────────────────────────────────────────────────

/**
 * Minimal RFC 4180-compliant CSV parser.
 * Handles quoted fields containing commas, newlines, and doubled double-quotes.
 * Returns an array of rows, each row being an array of string fields.
 */
export function parseCsvRaw(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let i = 0;
    const len = text.length;

    while (i < len) {
        // Quoted field
        if (text[i] === '"') {
            i++; // skip opening quote
            let field = '';
            while (i < len) {
                if (text[i] === '"') {
                    if (text[i + 1] === '"') {
                        // Escaped double-quote
                        field += '"';
                        i += 2;
                    } else {
                        // Closing quote
                        i++;
                        break;
                    }
                } else {
                    field += text[i++];
                }
            }
            row.push(field);
            // Skip optional comma after closing quote
            if (text[i] === ',') i++;
        } else {
            // Unquoted field — read until comma or line ending
            let field = '';
            while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
                field += text[i++];
            }
            row.push(field.trim());
            if (text[i] === ',') {
                i++;
            }
        }

        // End of line
        if (i >= len || text[i] === '\n' || text[i] === '\r') {
            // Skip \r\n or lone \n
            if (text[i] === '\r') i++;
            if (text[i] === '\n') i++;
            if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
                rows.push(row);
            }
            row = [];
        }
    }

    // Last row without trailing newline
    if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
        rows.push(row);
    }

    return rows;
}

/**
 * Detect whether a row looks like a header row.
 * Returns { frontCol, backCol } indices if detected, or null if it looks like data.
 */
function detectHeader(
    row: string[]
): { frontCol: number; backCol: number } | null {
    const lower = row.map((c) => c.toLowerCase().trim());

    // Check if any cell matches known header synonyms
    const hasHeaderWord = lower.some(
        (c) => FRONT_HEADERS.has(c) || BACK_HEADERS.has(c)
    );
    if (!hasHeaderWord && row.length >= 2) return null;

    const frontCol = lower.findIndex((c) => FRONT_HEADERS.has(c));
    const backCol = lower.findIndex((c) => BACK_HEADERS.has(c));

    // If we found both, use them
    if (frontCol !== -1 && backCol !== -1) return { frontCol, backCol };
    // If we found front but not back, assume back is the next column
    if (frontCol !== -1) return { frontCol, backCol: frontCol + 1 };
    // Otherwise fall back to col 0 = front, col 1 = back
    return null;
}

/** Parse a CSV text into cards. Strips filename extension from suggestedName. */
export function parseCsv(text: string, filename: string): ParseResult {
    const rows = parseCsvRaw(text);
    if (rows.length === 0) {
        throw new Error('The CSV file is empty.');
    }

    let startRow = 0;
    let frontCol = 0;
    let backCol = 1;

    const headerDetection = detectHeader(rows[0]);
    if (headerDetection) {
        startRow = 1;
        frontCol = headerDetection.frontCol;
        backCol = headerDetection.backCol;
    }

    const cards: ParsedCard[] = [];
    for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        const front = row[frontCol]?.trim() ?? '';
        const back = row[backCol]?.trim() ?? '';
        if (!front || !back) continue; // skip blank/incomplete rows
        cards.push({ front, back });
    }

    if (cards.length === 0) {
        throw new Error(
            'No valid cards found. Each row needs a non-empty front and back.'
        );
    }

    return {
        cards,
        suggestedName: filenameToName(filename),
    };
}

// ── JSON parser ───────────────────────────────────────────────────────────────

/** Parse the app's own JSON export format into cards. */
export function parseJson(text: string, filename: string): ParseResult {
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error('Invalid JSON — the file could not be parsed.');
    }

    // Accept either a single deck object or an array of decks (take first)
    const deck = Array.isArray(data) ? data[0] : data;

    if (!deck || typeof deck !== 'object') {
        throw new Error('Unexpected JSON format. Expected a deck object or array.');
    }

    const d = deck as Record<string, unknown>;

    if (!Array.isArray(d.cards)) {
        throw new Error('JSON is missing a "cards" array.');
    }

    const cards: ParsedCard[] = [];
    for (const [idx, raw] of (d.cards as unknown[]).entries()) {
        if (!raw || typeof raw !== 'object') {
            throw new Error(`Card at index ${idx} is not an object.`);
        }
        const c = raw as Record<string, unknown>;
        const front = typeof c.front === 'string' ? c.front.trim() : '';
        const back = typeof c.back === 'string' ? c.back.trim() : '';
        if (!front || !back) {
            throw new Error(
                `Card at index ${idx} is missing a non-empty "front" or "back".`
            );
        }
        const card: ParsedCard = { front, back };
        if (typeof c.efactor === 'number') card.efactor = c.efactor;
        if (typeof c.repetitions === 'number') card.repetitions = c.repetitions;
        if (typeof c.nextReview === 'number') card.nextReview = c.nextReview;
        if (typeof c.lastStudied === 'number') card.lastStudied = c.lastStudied;
        cards.push(card);
    }

    if (cards.length === 0) {
        throw new Error('The JSON deck contains no cards.');
    }

    const suggestedName =
        typeof d.name === 'string' && d.name.trim()
            ? d.name.trim()
            : filenameToName(filename);

    const description =
        typeof d.description === 'string' && d.description.trim()
            ? d.description.trim()
            : undefined;

    return { cards, suggestedName, description };
}

// ── File entry point ──────────────────────────────────────────────────────────

/** Read and parse a File object. Throws with a user-friendly message on any error. */
export async function parseDeckFile(file: File): Promise<ParseResult> {
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(
            `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`
        );
    }

    const text = await file.text();
    const name = file.name;

    if (name.endsWith('.json')) {
        return parseJson(text, name);
    }
    if (name.endsWith('.csv') || name.endsWith('.txt')) {
        return parseCsv(text, name);
    }

    throw new Error(
        'Unsupported file type. Please upload a .csv, .txt, or .json file.'
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip extension and replace underscores/hyphens with spaces. */
function filenameToName(filename: string): string {
    return filename
        .replace(/\.[^.]+$/, '')      // strip extension
        .replace(/[-_]/g, ' ')         // hyphens/underscores → spaces
        .trim()
        || 'Imported Deck';
}
