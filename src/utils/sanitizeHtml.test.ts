import { describe, it, expect } from 'vitest';
import {
  sanitizeCardHtml,
  renderQuestionCloze,
  renderAnswerCloze,
  escapeHtml,
} from './sanitizeHtml';

describe('Sanitize HTML & Cloze Security Engine', () => {
  it('strips dangerous script tags and event handlers', () => {
    const malicious = '<script>alert("xss")</script><img src="x" onerror="alert(1)" /><p>Safe text</p>';
    const cleaned = sanitizeCardHtml(malicious);
    expect(cleaned).not.toContain('<script>');
    expect(cleaned).not.toContain('onerror');
    expect(cleaned).toContain('<p>Safe text</p>');
  });

  it('prohibits iframe, object, and embed elements', () => {
    const iframePayload = '<iframe src="https://evil.com"></iframe><embed src="flash.swf">';
    const cleaned = sanitizeCardHtml(iframePayload);
    expect(cleaned).not.toContain('<iframe');
    expect(cleaned).not.toContain('<embed');
  });

  it('neutralizes javascript: URIs in links and attributes', () => {
    const jsUri = '<a href="javascript:alert(1)">Click Me</a>';
    const cleaned = sanitizeCardHtml(jsUri);
    expect(cleaned.toLowerCase()).not.toContain('javascript:');
  });

  it('preserves valid formatting tags like bold, italics, tables, and images', () => {
    const formatted = '<b>Bold</b> and <i>Italic</i> and <code>console.log()</code>';
    const cleaned = sanitizeCardHtml(formatted);
    expect(cleaned).toContain('<b>Bold</b>');
    expect(cleaned).toContain('<i>Italic</i>');
    expect(cleaned).toContain('<code>console.log()</code>');
  });

  it('replaces Cloze tags with masked placeholders in question', () => {
    const clozeQuestion = 'The capital of France is {{c1::Paris}}.';
    const rendered = renderQuestionCloze(clozeQuestion);
    expect(rendered).toContain('[...]');
    expect(rendered).not.toContain('Paris');
  });

  it('highlights Cloze answer in back view', () => {
    const clozeAnswer = 'The capital of France is {{c1::Paris}}.';
    const rendered = renderAnswerCloze(clozeAnswer);
    expect(rendered).toContain('Paris');
    expect(rendered).not.toContain('{{c1::');
  });

  it('sanitizes malicious injections inside Cloze deletions', () => {
    const clozeWithScript = 'Hello {{c1::<script>evil()</script>World}}';
    const rendered = renderAnswerCloze(clozeWithScript);
    expect(rendered).not.toContain('<script>');
    expect(rendered).toContain('World');
  });

  it('reliably escapes all HTML entities with escapeHtml fallback', () => {
    const unescaped = '<script>test & "quotes" \'apostrophe\'</script>';
    const escaped = escapeHtml(unescaped);
    expect(escaped).toBe('&lt;script&gt;test &amp; &quot;quotes&quot; &#039;apostrophe&#039;&lt;/script&gt;');
  });
});
