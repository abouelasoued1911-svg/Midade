/**
 * Anki Package (.apkg) file parser for browser & offline use.
 * Unpacks the .apkg zip archive, reads collection.anki2 / collection.anki21 SQLite database,
 * extracts decks and cards, resolves media assets into data URLs, and maps to MIDADE format.
 */

import JSZip from 'jszip';
import initSqlJs, { Database } from 'sql.js';
import { Card, Deck, CardState, CardType } from '../types';
import { generateId } from '../utils/id';

export interface ApkgImportResult {
  decks: Deck[];
  cards: Card[];
  totalNotes: number;
  totalCards: number;
  mediaCount: number;
}

// Safety boundaries to protect mobile phone memory and browser stability
const MAX_MEDIA_FILES = 250;
const MAX_SINGLE_MEDIA_BYTES = 5 * 1024 * 1024; // 5 MB per file
const MAX_TOTAL_MEDIA_BYTES = 30 * 1024 * 1024; // 30 MB total

/**
 * Resolves the path to sql-wasm.wasm relative to the current deployment base,
 * ensuring compatibility with GitHub Pages subpaths, Cloudflare Pages, Netlify,
 * Vercel, and Firebase Hosting.
 */
export function getSqlWasmUrl(): string {
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL)
    ? import.meta.env.BASE_URL
    : './';
  const sanitizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${sanitizedBase}sql-wasm.wasm`;
}

/**
 * Parses an Anki (.apkg) package into Midade decks and cards.
 */
export async function parseApkgFile(
  file: File | Blob,
  fallbackDeckName?: string
): Promise<ApkgImportResult> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch (err: any) {
    throw new Error('الملف غير صالح أو تالف. يرجى التأكد من اختيار ملف Anki صالح بصيغة .apkg (Invalid or corrupted .apkg file).');
  }

  // 1. Locate the collection database (collection.anki21 or collection.anki2)
  let ankiDbEntry = zip.file('collection.anki21') || zip.file('collection.anki2');

  // Some packages might have uppercase or nested paths
  if (!ankiDbEntry) {
    const allFiles = Object.keys(zip.files);
    const dbFile = allFiles.find((f) => f.toLowerCase().endsWith('.anki21') || f.toLowerCase().endsWith('.anki2'));
    if (dbFile) {
      ankiDbEntry = zip.file(dbFile);
    }
  }

  if (!ankiDbEntry) {
    throw new Error('حزمة Anki غير مدعومة أو لا تحتوي على قاعدة بيانات (collection.anki2/anki21 not found).');
  }

  // 2. Read media dictionary if present (e.g., {"0": "photo.jpg", "1": "audio.mp3"})
  const mediaMap = new Map<string, string>(); // filename -> dataUrl
  const mediaFile = zip.file('media');
  let mediaExtractedCount = 0;
  let totalMediaBytes = 0;

  if (mediaFile) {
    try {
      const mediaJsonStr = await mediaFile.async('text');
      const mediaNumToName: Record<string, string> = JSON.parse(mediaJsonStr);
      const entries = Object.entries(mediaNumToName).slice(0, MAX_MEDIA_FILES);

      for (const [numStr, origFilename] of entries) {
        const itemZipFile = zip.file(numStr);
        if (itemZipFile) {
          const lowerName = origFilename.toLowerCase();
          let mime = 'application/octet-stream';
          if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) mime = 'image/jpeg';
          else if (lowerName.endsWith('.png')) mime = 'image/png';
          else if (lowerName.endsWith('.gif')) mime = 'image/gif';
          else if (lowerName.endsWith('.svg')) mime = 'image/svg+xml';
          else if (lowerName.endsWith('.webp')) mime = 'image/webp';
          else if (lowerName.endsWith('.mp3')) mime = 'audio/mpeg';
          else if (lowerName.endsWith('.ogg')) mime = 'audio/ogg';
          else if (lowerName.endsWith('.wav')) mime = 'audio/wav';

          const buffer = await itemZipFile.async('uint8array');
          if (buffer.byteLength > MAX_SINGLE_MEDIA_BYTES) {
            console.warn(`Media file ${origFilename} exceeds 5MB limit, skipped.`);
            continue;
          }

          if (totalMediaBytes + buffer.byteLength > MAX_TOTAL_MEDIA_BYTES) {
            console.warn('Total media extraction limit reached (30MB), skipping remaining assets.');
            break;
          }

          totalMediaBytes += buffer.byteLength;
          const base64 = await itemZipFile.async('base64');
          const dataUrl = `data:${mime};base64,${base64}`;

          mediaMap.set(origFilename, dataUrl);
          mediaMap.set(decodeURIComponent(origFilename), dataUrl);
          mediaExtractedCount++;
        }
      }
    } catch (e) {
      console.warn('Could not process media map in .apkg:', e);
    }
  }

  // 3. Initialize SQLite WebAssembly with portable path
  const dbBytes = await ankiDbEntry.async('uint8array');
  const wasmPath = getSqlWasmUrl();

  const SQL = await initSqlJs({
    locateFile: () => wasmPath,
  });

  const db: Database = new SQL.Database(dbBytes);

  try {
    // 4. Extract decks from col table
    const decks: Deck[] = [];
    const deckIdMap = new Map<string, string>(); // ankiDeckId -> midadeDeckId
    const nowIso = new Date().toISOString();

    let collectionCreationTime = Math.floor(Date.now() / 1000);

    try {
      const colResults = db.exec('SELECT crt, decks, models FROM col LIMIT 1;');
      if (colResults.length > 0 && colResults[0].values.length > 0) {
        const row = colResults[0].values[0];
        if (typeof row[0] === 'number') {
          collectionCreationTime = row[0];
        }

        const decksJson = row[1];
        if (typeof decksJson === 'string') {
          const rawDecks = JSON.parse(decksJson);
          for (const ankiId of Object.keys(rawDecks)) {
            const rawDeck = rawDecks[ankiId];
            if (!rawDeck || !rawDeck.name) continue;

            // Anki decks use "::" for subdecks (e.g. "Languages::Spanish")
            const cleanName = rawDeck.name.replace(/::/g, ' ➔ ');
            const midadeDeckId = generateId(`deck-apkg-${ankiId}`);
            deckIdMap.set(String(ankiId), midadeDeckId);

            decks.push({
              id: midadeDeckId,
              userId: 'local',
              name: cleanName,
              description: rawDeck.desc || '',
              color: '#1976D2',
              newCardsPerDay: 20,
              reviewCardsPerDay: 100,
              createdAt: nowIso,
              updatedAt: nowIso,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Error querying col table:', e);
    }

    // Default fallback deck if no decks found in col
    if (decks.length === 0) {
      const defaultDeckId = generateId('deck-apkg');
      const fallbackName = fallbackDeckName || 'Imported Anki Deck';
      decks.push({
        id: defaultDeckId,
        userId: 'local',
        name: fallbackName,
        description: 'Imported from .apkg',
        color: '#1976D2',
        newCardsPerDay: 20,
        reviewCardsPerDay: 100,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      deckIdMap.set('default', defaultDeckId);
    }

    // Function to replace media references with data URLs
    const resolveMedia = (content: string): string => {
      if (!content || mediaMap.size === 0) return content;
      let resolved = content;

      // Replace <img src="filename">
      mediaMap.forEach((dataUrl, filename) => {
        const safeName = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const imgRegex = new RegExp(`src=["']?(${safeName})["']?`, 'gi');
        resolved = resolved.replace(imgRegex, `src="${dataUrl}"`);

        // Replace [sound:filename]
        const soundRegex = new RegExp(`\\[sound:(${safeName})\\]`, 'gi');
        resolved = resolved.replace(
          soundRegex,
          `<audio controls class="my-2 max-w-full h-8"><source src="${dataUrl}" type="audio/mpeg"></audio>`
        );
      });

      return resolved;
    };

    // 5. Query cards and notes
    const cards: Card[] = [];
    const targetDefaultDeckId = decks[0].id;
    let hasExtractedWithCards = false;

    try {
      const cardResults = db.exec(`
        SELECT 
          c.id AS card_id,
          c.did AS deck_id,
          c.type AS card_type,
          c.due AS card_due,
          c.ivl AS card_ivl,
          c.factor AS card_factor,
          c.reps AS card_reps,
          c.lapses AS card_lapses,
          n.id AS note_id,
          n.flds AS note_fields,
          n.tags AS note_tags
        FROM cards c
        JOIN notes n ON c.nid = n.id;
      `);

      if (cardResults.length > 0 && cardResults[0].values.length > 0) {
        hasExtractedWithCards = true;
        const rows = cardResults[0].values;

        for (const row of rows) {
          const cardId = String(row[0]);
          const rawDeckId = String(row[1]);
          const ankiType = Number(row[2]) || 0;
          const dueVal = Number(row[3]) || 0;
          const ivlVal = Number(row[4]) || 0;
          const factorVal = Number(row[5]) || 2500;
          const repsVal = Number(row[6]) || 0;
          const lapsesVal = Number(row[7]) || 0;
          const fieldsStr = String(row[9] || '');
          const tagsStr = String(row[10] || '');

          const midadeDeckId = deckIdMap.get(rawDeckId) || targetDefaultDeckId;

          // Fields are separated by \x1f
          const fields = fieldsStr.split('\x1f');
          const frontRaw = fields[0] || '';
          const backRaw = fields.length > 1 ? fields.slice(1).join('<br><hr class="my-2 border-gray-200 dark:border-gray-700"><br>') : '';

          const front = resolveMedia(frontRaw.trim());
          const back = resolveMedia(backRaw.trim() || frontRaw.trim());

          if (!front && !back) continue;

          // State mapping: 0=new, 1=learning, 2=review, 3=relearning
          let state: CardState = 'new';
          if (ankiType === 1) state = 'learning';
          else if (ankiType === 2) state = 'review';
          else if (ankiType === 3) state = 'relearning';

          let dueDate = new Date();
          if (ankiType === 2) {
            dueDate = new Date((collectionCreationTime + dueVal * 86400) * 1000);
          } else if (ankiType === 1 || ankiType === 3) {
            dueDate = new Date(dueVal * 1000);
          }

          const cardType: CardType = front.includes('{{c') || front.includes('{{C') ? 'cloze' : 'basic';
          const tags = tagsStr ? tagsStr.trim().split(/\s+/).filter(Boolean) : [];

          cards.push({
            id: generateId(`card-apkg-${cardId}`),
            userId: 'local',
            deckId: midadeDeckId,
            front,
            back,
            cardType,
            tags,
            state,
            interval: ivlVal,
            easeFactor: factorVal / 1000,
            repetitions: repsVal,
            lapses: lapsesVal,
            dueDate: isNaN(dueDate.getTime()) ? nowIso : dueDate.toISOString(),
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }
      }
    } catch (e) {
      console.warn('Cards + Notes join query note:', e);
    }

    // 6. Fallback to notes table alone if cards join returned 0
    if (!hasExtractedWithCards || cards.length === 0) {
      try {
        const noteResults = db.exec('SELECT id, flds, tags FROM notes;');
        if (noteResults.length > 0 && noteResults[0].values.length > 0) {
          const rows = noteResults[0].values;
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const noteId = String(row[0]);
            const fieldsStr = String(row[1] || '');
            const tagsStr = String(row[2] || '');

            const fields = fieldsStr.split('\x1f');
            const frontRaw = fields[0] || '';
            const backRaw = fields.length > 1 ? fields.slice(1).join('<br><hr class="my-2"><br>') : '';

            const front = resolveMedia(frontRaw.trim());
            const back = resolveMedia(backRaw.trim() || frontRaw.trim());

            if (!front && !back) continue;

            const cardType: CardType = front.includes('{{c') || front.includes('{{C') ? 'cloze' : 'basic';
            const tags = tagsStr ? tagsStr.trim().split(/\s+/).filter(Boolean) : [];

            cards.push({
              id: generateId(`card-note-${noteId}`),
              userId: 'local',
              deckId: targetDefaultDeckId,
              front,
              back,
              cardType,
              tags,
              state: 'new',
              interval: 0,
              easeFactor: 2.5,
              repetitions: 0,
              lapses: 0,
              dueDate: nowIso,
              createdAt: nowIso,
              updatedAt: nowIso,
            });
          }
        }
      } catch (e) {
        console.warn('Fallback notes query note:', e);
      }
    }

    // Filter out empty decks (decks with 0 cards) if we have non-empty decks
    const deckCardCounts = new Map<string, number>();
    cards.forEach((c) => {
      deckCardCounts.set(c.deckId, (deckCardCounts.get(c.deckId) || 0) + 1);
    });

    const activeDecks = decks.filter((d) => (deckCardCounts.get(d.id) || 0) > 0);
    const finalDecks = activeDecks.length > 0 ? activeDecks : decks;

    return {
      decks: finalDecks,
      cards,
      totalNotes: cards.length,
      totalCards: cards.length,
      mediaCount: mediaExtractedCount,
    };
  } finally {
    db.close();
  }
}
