const DIACRITICS = /[̀-ͯ]/g;
const WHITESPACE = /\s+/g;

/** Lowercase, accent-free, single-spaced text so "Canción" matches "cancion". */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(WHITESPACE, " ")
    .trim();
}

/**
 * What the search index sees: episodes pass (title, author, show title) and
 * shows (title, author), so a creator's or show's name finds them.
 */
export function searchTextOf(...parts: (string | undefined)[]): string {
  return normalizeSearchText(parts.filter(Boolean).join(" "));
}

/**
 * Cleans an AI-written script for TTS: drops markdown marks, keeps paragraphs,
 * and cuts at the last paragraph or sentence end that fits in maxChars.
 */
export function tidyScript(text: string, maxChars: number): string {
  const clean = text
    .replace(/\r\n?/g, "\n")
    .replace(/^[ \t]*(#{1,6}[ \t]+|[-*•][ \t]+)/gm, "")
    .replace(/(\*\*|__|\*|`)/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (clean.length <= maxChars) return clean;

  const head = clean.slice(0, maxChars);
  const paragraph = head.lastIndexOf("\n\n");
  if (paragraph > maxChars / 2) return head.slice(0, paragraph).trim();
  const sentence = Math.max(
    head.lastIndexOf(". "),
    head.lastIndexOf("? "),
    head.lastIndexOf("! "),
  );
  return (sentence > 0 ? head.slice(0, sentence + 1) : head).trim();
}
