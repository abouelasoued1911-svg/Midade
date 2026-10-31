import { describe, it, expect } from 'vitest';
import {
  parseCsvToGrid,
  parseFlashcardCsv,
  detectDelimiter,
  formatCsv,
} from './csvParser';

describe('RFC 4180 CSV / TSV Parser', () => {
  it('correctly auto-detects delimiters (tab, comma, semicolon, pipe)', () => {
    expect(detectDelimiter('Front\tBack\nHello\tWorld')).toBe('\t');
    expect(detectDelimiter('Front,Back\nHello,World')).toBe(',');
    expect(detectDelimiter('Front;Back\nHello;World')).toBe(';');
    expect(detectDelimiter('Front|Back\nHello|World')).toBe('|');
  });

  it('handles commas and delimiters inside quoted fields', () => {
    const csv = '"Paris, France","Capital of France"\n"Cairo, Egypt","Capital of Egypt"';
    const grid = parseCsvToGrid(csv, ',');
    expect(grid).toHaveLength(2);
    expect(grid[0][0]).toBe('Paris, France');
    expect(grid[0][1]).toBe('Capital of France');
    expect(grid[1][0]).toBe('Cairo, Egypt');
    expect(grid[1][1]).toBe('Capital of Egypt');
  });

  it('handles escaped quotes ("") inside cells', () => {
    const csv = '"She said ""Hello!"" to me","Greeting"';
    const grid = parseCsvToGrid(csv, ',');
    expect(grid).toHaveLength(1);
    expect(grid[0][0]).toBe('She said "Hello!" to me');
    expect(grid[0][1]).toBe('Greeting');
  });

  it('supports newlines within quoted cells', () => {
    const multilineCsv = '"Line 1\nLine 2\nLine 3","Multi-line answer"';
    const grid = parseCsvToGrid(multilineCsv, ',');
    expect(grid).toHaveLength(1);
    expect(grid[0][0]).toBe('Line 1\nLine 2\nLine 3');
    expect(grid[0][1]).toBe('Multi-line answer');
  });

  it('correctly parses Arabic text and RTL characters with diacritics', () => {
    const arabicTsv = 'كتاب\tBook\tعربية\nقلم\tPen\tأدوات';
    const cards = parseFlashcardCsv(arabicTsv, '\t');
    expect(cards).toHaveLength(2);
    expect(cards[0].front).toBe('كتاب');
    expect(cards[0].back).toBe('Book');
    expect(cards[0].tags).toContain('عربية');
    expect(cards[1].front).toBe('قلم');
    expect(cards[1].back).toBe('Pen');
  });

  it('detects and strips header rows automatically', () => {
    const withHeader = 'Front\tBack\tTags\nApple\tFruit\tvocab\nCat\tAnimal\tvocab';
    const cards = parseFlashcardCsv(withHeader, '\t');
    expect(cards).toHaveLength(2);
    expect(cards[0].front).toBe('Apple');
    expect(cards[1].front).toBe('Cat');
  });

  it('auto-detects Cloze cards based on {{c1::...}} syntax', () => {
    const clozeRow = 'The capital of Spain is {{c1::Madrid}}\tCity in Europe';
    const cards = parseFlashcardCsv(clozeRow, '\t');
    expect(cards[0].cardType).toBe('cloze');
  });

  it('formats 2D arrays back into compliant RFC 4180 CSV/TSV with proper escaping', () => {
    const input = [
      ['Question with, comma', 'Answer with "quotes"', 'Normal tag'],
      ['Multi\nline', 'Back', 'tag2'],
    ];
    const formatted = formatCsv(input, ',');
    const reparsed = parseCsvToGrid(formatted, ',');
    expect(reparsed[0][0]).toBe('Question with, comma');
    expect(reparsed[0][1]).toBe('Answer with "quotes"');
    expect(reparsed[1][0]).toBe('Multi\nline');
  });
});
