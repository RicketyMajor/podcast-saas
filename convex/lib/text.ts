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
