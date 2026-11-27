/**
 * Normalization for Persian free-text search (ACC-001.7).
 *
 * A Persian user types the same letter in more than one way and expects all of
 * them to match: the Arabic yeh (`ي`) and alef maksura (`ى`) instead of the
 * Persian yeh (`ی`), the Arabic kaf (`ك`) instead of the Persian keheh (`ک`),
 * and Western, Persian or Arabic-Indic digits for the same number. Keyboard
 * layout, copy/paste from another system and imported data all produce variants,
 * so a search that compares raw code points misses records the user can plainly
 * see.
 *
 * `normalizePersianSearch` folds those variants into one canonical form before
 * comparison. It is deliberately a *search* helper, not a data migration: stored
 * names and codes keep the spelling their author chose, and only the comparison
 * is normalized. Case is folded too, so a Latin code such as `Cash` matches
 * `cash`.
 *
 * The rules are:
 *
 * - Arabic yeh / alef maksura → Persian yeh `ی`;
 * - Arabic kaf → Persian keheh `ک`;
 * - Persian (`۰`–`۹`) and Arabic-Indic (`٠`–`٩`) digits → ASCII `0`–`9`;
 * - Arabic combining marks are removed alongside tatweel;
 * - zero-width non-joiner (`U+200C`) is removed, so `دارایی‌ها` and `داراییها`
 *   match each other;
 * - Unicode White_Space characters and `U+FEFF` are converted to ordinary
 *   spaces, then runs are collapsed and surrounding space is trimmed.
 *
 * No other letter is changed: `ة`/`ه` and `أ`/`ا` are meaningfully different in
 * account names and are left to the author.
 */

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

const PERSIAN_DIGIT_PATTERN = /[\u06F0-\u06F9]/g;
const ARABIC_DIGIT_PATTERN = /[\u0660-\u0669]/g;
const ARABIC_DIACRITIC_PATTERN = /(?=\p{Script_Extensions=Arabic})\p{M}/gu;
const UNICODE_WHITESPACE_PATTERN = /[\p{White_Space}\uFEFF]+/gu;

/** The canonical form of `input`, used for comparing search text. */
export function normalizePersianSearch(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .normalize('NFC')
    .replace(/[\u064A\u0649]/g, '\u06CC')
    .replace(/\u0643/g, '\u06A9')
    .replace(PERSIAN_DIGIT_PATTERN, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(ARABIC_DIGIT_PATTERN, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(ARABIC_DIACRITIC_PATTERN, '')
    .replace(/\u0640/g, '')
    .replace(/\u200C/g, '')
    .toLowerCase()
    .replace(UNICODE_WHITESPACE_PATTERN, ' ')
    .trim();
}

/**
 * Whether `haystack` contains `needle` after both are normalized.
 *
 * An empty needle matches everything — an unfiltered list is the natural
 * meaning of "search for nothing".
 */
export function matchesPersianSearch(haystack: string, needle: string): boolean {
  const normalizedNeedle = normalizePersianSearch(needle);
  if (normalizedNeedle === '') {
    return true;
  }

  return normalizePersianSearch(haystack).includes(normalizedNeedle);
}
