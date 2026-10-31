import DOMPurify from 'dompurify';

/**
 * Whitelist of safe HTML tags for Anki-like flashcards.
 * Prohibits executable scripts, iframes, objects, forms, and handlers.
 */
const ALLOWED_TAGS = [
  'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del',
  'br', 'hr', 'span', 'p', 'div', 'code', 'pre', 'blockquote',
  'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'audio', 'video', 'source',
  'ruby', 'rt', 'rp', 'sub', 'sup', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'font', 'center', 'mark', 'kbd', 'var', 'samp', 'a'
];

const ALLOWED_ATTR = [
  'class', 'style', 'src', 'alt', 'title', 'dir', 'controls',
  'width', 'height', 'color', 'align', 'href', 'target', 'rel'
];

function getPurifyInstance(): any {
  let instance: any = DOMPurify;
  if (typeof DOMPurify === 'function') {
    if (typeof (DOMPurify as any).sanitize === 'function') {
      instance = DOMPurify;
    } else if (typeof window !== 'undefined') {
      instance = (DOMPurify as any)(window);
    }
  } else if ((DOMPurify as any)?.default) {
    const def = (DOMPurify as any).default;
    if (typeof def === 'function') {
      if (typeof def.sanitize === 'function') {
        instance = def;
      } else if (typeof window !== 'undefined') {
        instance = def(window);
      }
    } else {
      instance = def;
    }
  }

  if (instance && typeof instance.addHook === 'function') {
    try {
      instance.addHook('afterSanitizeAttributes', (node: Element) => {
        if (node.tagName === 'A') {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
        }
        ['src', 'href', 'action'].forEach((attr) => {
          const val = node.getAttribute(attr);
          if (val && /^\s*javascript\s*:/i.test(val)) {
            node.removeAttribute(attr);
          }
        });
      });
    } catch {
      // Hook setup skipped in non-DOM environments
    }
  }

  return instance;
}

/**
 * Escapes HTML characters into safe text entities.
 * Used as a fail-safe fallback when DOMPurify is unavailable.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes HTML content for secure display in flashcard front/back views.
 * Strictly prevents XSS, dangerous protocols, and unauthorized event handlers.
 * If DOMPurify is unavailable, safely escapes the content as text without using regex stripping.
 */
export function sanitizeCardHtml(dirtyHtml: string): string {
  if (!dirtyHtml) return '';

  const purify = getPurifyInstance();

  if (purify && typeof purify.sanitize === 'function') {
    return purify.sanitize(dirtyHtml, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
      ADD_TAGS: [],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'base', 'meta', 'link'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'formaction'],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$)|data:image\/|data:audio\/)/i,
    });
  }

  // Safe fail-safe: Escape all HTML entities completely when sanitizer is unavailable
  return escapeHtml(dirtyHtml);
}

/**
 * Formats front question text by replacing Cloze deletions {{c1::word}} with [...]
 * and safely sanitizing the final HTML.
 */
export function renderQuestionCloze(text: string): string {
  if (!text) return '';
  const parsed = text.replace(
    /\{\{c\d+::(.*?)(::.*?)?\}\}/g,
    '<span class="cloze bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold">[...]</span>'
  );
  return sanitizeCardHtml(parsed);
}

/**
 * Formats back answer text by highlighting Cloze deletions {{c1::word}}
 * and safely sanitizing the final HTML.
 */
export function renderAnswerCloze(text: string): string {
  if (!text) return '';
  const parsed = text.replace(
    /\{\{c\d+::(.*?)(::.*?)?\}\}/g,
    '<span class="cloze font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">$1</span>'
  );
  return sanitizeCardHtml(parsed);
}
