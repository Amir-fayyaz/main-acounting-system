/**
 * Persian text normalizer for duplicate detection and search indexing (S2; PUR-BR-005).
 *
 * Normalizes text by:
 * - Converting Arabic Yeh and Kaf characters to their Persian equivalents (ي -> ی, ك -> ک).
 * - Normalizing Teh Marbuta and Heh variants (ة -> ه, ۀ -> ه).
 * - Normalizing Alef variants (آ, أ, إ, ٱ -> ا).
 * - Stripping Tatweel (ـ).
 * - Stripping Arabic and Persian diacritics / Harakat (Fatha, Damma, Kasra, Tanwin, Sukun, Shadda).
 * - Normalizing Arabic and Persian digits to standard ASCII digits (۰-۹ and ٠-٩ -> 0-9).
 * - Converting Zero-Width Non-Joiner (ZWNJ) and Zero-Width Joiner to space.
 * - Lowercasing Latin letters.
 * - Collapsing multiple whitespace sequences into a single space and trimming ends.
 */

const ARABIC_TO_PERSIAN_MAP: Record<string, string> = {
  '\u064A': '\u06CC', // Arabic Yeh (ي) -> Persian Yeh (ی)
  '\u0649': '\u06CC', // Alef Maksura (ى) -> Persian Yeh (ی)
  '\u0643': '\u06A9', // Arabic Kaf (ك) -> Persian Kaf (ک)
  '\u0629': '\u0647', // Teh Marbuta (ة) -> Persian Heh (ه)
  '\u06C0': '\u0647', // Heh with Yeh above (ۀ) -> Persian Heh (ه)
  '\u0622': '\u0627', // Alef with Madda (آ) -> Alef (ا)
  '\u0623': '\u0627', // Alef with Hamza above (أ) -> Alef (ا)
  '\u0625': '\u0627', // Alef with Hamza below (إ) -> Alef (ا)
  '\u0671': '\u0627', // Alef Wasla (ٱ) -> Alef (ا)
};

/** Arabic-Indic and Eastern-Arabic-Indic digits mapping to ASCII 0-9 */
const DIGIT_MAP: Record<string, string> = {
  '\u0660': '0',
  '\u0661': '1',
  '\u0662': '2',
  '\u0663': '3',
  '\u0664': '4',
  '\u0665': '5',
  '\u0666': '6',
  '\u0667': '7',
  '\u0668': '8',
  '\u0669': '9',
  '\u06F0': '0',
  '\u06F1': '1',
  '\u06F2': '2',
  '\u06F3': '3',
  '\u06F4': '4',
  '\u06F5': '5',
  '\u06F6': '6',
  '\u06F7': '7',
  '\u06F8': '8',
  '\u06F9': '9',
};

/** Diacritics regex: Fatha, Damma, Kasra, Tanwin, Sukun, Shadda, Maddah, etc. */
const DIACRITICS_REGEX = /[\u064B-\u0655\u0670]/gu;

/** Tatweel regex */
const TATWEEL_REGEX = /\u0640/g;

/** ZWNJ and ZWJ regex using alternation to avoid character class joining ambiguities */
const ZERO_WIDTH_REGEX = /(?:\u200C|\u200D|\u200E|\u200F|\uFEFF)/g;

/** Multiple whitespace regex */
const MULTI_SPACE_REGEX = /\s+/g;

export function normalizePersianText(input: string): string {
  if (!input) {
    return '';
  }

  let text = input.trim().toLowerCase();

  // Strip tatweel
  text = text.replace(TATWEEL_REGEX, '');

  // Strip diacritics
  text = text.replace(DIACRITICS_REGEX, '');

  // Replace ZWNJ / ZWJ with space so words separated by ZWNJ don't merge
  text = text.replace(ZERO_WIDTH_REGEX, ' ');

  // Map Arabic characters and digits
  let result = '';
  for (const char of text) {
    if (ARABIC_TO_PERSIAN_MAP[char] !== undefined) {
      result += ARABIC_TO_PERSIAN_MAP[char];
    } else if (DIGIT_MAP[char] !== undefined) {
      result += DIGIT_MAP[char];
    } else {
      result += char;
    }
  }

  // Collapse multiple spaces into one and trim
  return result.replace(MULTI_SPACE_REGEX, ' ').trim();
}
