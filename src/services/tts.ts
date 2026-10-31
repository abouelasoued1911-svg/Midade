/**
 * Text-to-speech helper with multi-language detection for cards
 */
export function speakText(text: string, preferredLang?: string) {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser.');
    return;
  }

  // Clean text from cloze markup {{c1::word}} -> word and HTML tags
  const clean = text
    .replace(/\{\{c\d+::(.*?)(::.*?)?\}\}/g, '$1')
    .replace(/<[^>]*>/g, '')
    .trim();

  if (!clean) return;

  window.speechSynthesis.cancel(); // stop any current speech

  const utterance = new SpeechSynthesisUtterance(clean);

  // Auto-detect language if not explicitly provided
  if (preferredLang) {
    utterance.lang = preferredLang;
  } else {
    // Unicode ranges
    const isThai = /[\u0E00-\u0E7F]/.test(clean);
    const isArabic = /[\u0600-\u06FF]/.test(clean);
    const isJapanese = /[\u3040-\u30FF\u31F0-\u31FF]/.test(clean);
    const isChinese = /[\u4E00-\u9FFF]/.test(clean);
    const isRussian = /[\u0400-\u04FF]/.test(clean);

    if (isThai) {
      utterance.lang = 'th-TH';
    } else if (isArabic) {
      utterance.lang = 'ar-SA';
    } else if (isJapanese) {
      utterance.lang = 'ja-JP';
    } else if (isChinese) {
      utterance.lang = 'zh-CN';
    } else if (isRussian) {
      utterance.lang = 'ru-RU';
    } else {
      utterance.lang = 'en-US';
    }
  }

  utterance.rate = 0.95; // comfortable study speed
  window.speechSynthesis.speak(utterance);
}
