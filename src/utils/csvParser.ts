/**
 * Robust RFC 4180 Compliant CSV & TSV Parser.
 *
 * Supports:
 * - Quotes within cells ("hello ""world""")
 * - Delimiters within quotes (e.g. "Paris, France")
 * - Multi-line content / newlines within cells
 * - UTF-8, Arabic, and multilingual text
 * - Auto-detection of delimiter (comma, tab, semicolon, pipe)
 * - Safe handling of empty cells and large files
 */

export interface ParsedFlashcardRow {
  front: string;
  back: string;
  tags: string[];
  cardType?: 'basic' | 'cloze' | 'typeIn';
}

/**
 * Detects the most probable delimiter from sample lines of text.
 */
export function detectDelimiter(text: string): string {
  const sample = text.slice(0, 4096);
  // Count frequency of common delimiters
  const tabCount = (sample.match(/\t/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;
  const semicolonCount = (sample.match(/;/g) || []).length;
  const pipeCount = (sample.match(/\|/g) || []).length;

  if (tabCount >= commaCount && tabCount >= semicolonCount && tabCount > 0) {
    return '\t';
  }
  if (semicolonCount > commaCount && semicolonCount > 0) {
    return ';';
  }
  if (pipeCount > commaCount && pipeCount > 0) {
    return '|';
  }
  return ',';
}

/**
 * Parses raw CSV/TSV text into a 2D array of strings according to RFC 4180.
 */
export function parseCsvToGrid(text: string, customDelimiter?: string): string[][] {
  if (!text || !text.trim()) return [];

  const delimiter = customDelimiter || detectDelimiter(text);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];
    const nextChar = i + 1 < len ? text[i + 1] : '';

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote: "" -> "
        currentCell += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
        i++;
        continue;
      }
    }

    if (!insideQuotes) {
      if (char === delimiter) {
        currentRow.push(currentCell);
        currentCell = '';
        i++;
        continue;
      }

      if (char === '\r' && nextChar === '\n') {
        // CRLF newline
        currentRow.push(currentCell);
        currentCell = '';
        rows.push(currentRow);
        currentRow = [];
        i += 2;
        continue;
      }

      if (char === '\n' || char === '\r') {
        // Single LF or CR newline
        currentRow.push(currentCell);
        currentCell = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      }
    }

    // Regular character (or character inside quotes)
    currentCell += char;
    i++;
  }

  // Push final cell and row
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  // Filter out empty trailing lines
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

/**
 * Parses CSV/TSV text into Midade flashcard rows.
 */
export function parseFlashcardCsv(text: string, delimiter?: string): ParsedFlashcardRow[] {
  const grid = parseCsvToGrid(text, delimiter);
  const result: ParsedFlashcardRow[] = [];

  for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
    const row = grid[rowIndex];
    if (row.length < 2) continue;

    // Check if first row is a header like ["Front", "Back"] or ["Question", "Answer"]
    if (rowIndex === 0 && isHeaderRow(row)) {
      continue;
    }

    const front = row[0].trim();
    const back = row[1].trim();

    if (!front && !back) continue;

    let tags: string[] = [];
    if (row[2]) {
      tags = row[2]
        .split(/[,;\s]+/)
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);
    }

    // Auto-detect cloze syntax {{c1::...}}
    let cardType: 'basic' | 'cloze' | 'typeIn' = 'basic';
    if (/\{\{c\d+::/i.test(front)) {
      cardType = 'cloze';
    } else if (row[3] && ['basic', 'cloze', 'typeIn'].includes(row[3].trim())) {
      cardType = row[3].trim() as any;
    }

    result.push({
      front,
      back,
      tags,
      cardType,
    });
  }

  return result;
}

function isHeaderRow(row: string[]): boolean {
  const f = row[0].toLowerCase().trim();
  const b = row[1].toLowerCase().trim();
  const headerFrontTerms = ['front', 'question', 'term', 'prompt', 'front side', 'سؤال', 'الواجهة'];
  const headerBackTerms = ['back', 'answer', 'definition', 'response', 'back side', 'جواب', 'إجابة', 'الخلفية'];

  return headerFrontTerms.includes(f) && headerBackTerms.includes(b);
}

/**
 * Formats a 2D array into an RFC 4180 compliant CSV / TSV string.
 */
export function formatCsv(rows: string[][], delimiter: string = '\t'): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const str = cell ?? '';
          const needsQuotes =
            str.includes(delimiter) ||
            str.includes('"') ||
            str.includes('\n') ||
            str.includes('\r');

          if (needsQuotes) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(delimiter)
    )
    .join('\n');
}
