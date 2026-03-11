# Export test fixtures

Sample CSV files for validating the export feature. Each file represents a specific
test case — compare what the app generates against these reference files.

---

## Files

### `single-deck-basic.csv`
**Tests:** Normal per-deck CSV export with no special characters.

Expected shape:
- First row: `front,back` header
- 5 data rows, no quoting needed
- Open in Numbers / Excel / Google Sheets — all cells should be clean

**How to use:** Create a deck called "Biology 101", add the 5 cards manually (or via
AI), export as CSV, and diff against this file.

---

### `single-deck-rfc4180-escaping.csv`
**Tests:** RFC 4180 edge cases — fields containing commas, double-quotes, and newlines.

Expected shape:
- Fields containing `,` or `"` or newlines are wrapped in double-quotes
- Literal `"` inside a quoted field is escaped as `""`
- Multi-line field content is valid when the field is quoted

**How to use:** Create a deck and add cards whose fronts/backs contain commas, quotes,
and newlines. Export as CSV and open in a spreadsheet — no cell should be split
incorrectly and no quote character should appear as a stray `"`.

---

### `single-deck-empty.csv`
**Tests:** Exporting a deck that has no cards.

Expected shape:
- Exactly one line: `front,back`
- No data rows

**How to use:** Create a fresh deck, add no cards, export as CSV. The file should
match — just the header, nothing else.


