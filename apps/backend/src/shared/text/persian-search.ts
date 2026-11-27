/**
 * The single Persian text normalization used for search and duplicate
 * detection (S2; ACC-001.7).
 *
 * A Persian user types the same letter in more than one way and expects all of
 * them to match: the Arabic yeh (`ي`) and alef maksura (`ى`) instead of the
 * Persian yeh (`ی`), the Arabic kaf (`ك`) instead of the Persian keheh (`ک`),
 * and Western, Persian or Arabic-Indic digits for the same number. Keyboard
 * layout, copy/paste from another system and imported data all produce
 * variants, so a comparison that reads raw code points misses records the user
 * can plainly see.
 *
 * {@link normalizePersianSearch} folds those variants into one canonical form
 * before comparison. It is deliberately a *comparison* helper, not a data
 * migration: stored names and codes keep the spelling their author chose, and
 * only the comparison is normalized. Every search and duplicate check in the
 * product must use this module so two screens can never disagree about whether
 * `بانك` equals `بانک`.
 *
 * The rules, in order:
 *
 * 1. Unicode NFC, so a decomposed letter and its precomposed form are treated
 *    the same before anything is removed;
 * 2. Arabic yeh and alef maksura → Persian yeh `ی`;
 * 3. Arabic kaf → Persian keheh `ک`;
 * 4. combining marks that belong to the Arabic script and tatweel are removed
 *    (`حَساب` → `حساب`, `کتـــاب` → `کتاب`);
 * 5. zero-width non-joiner (`U+200C`) is removed — **decision**: it is
 *    invisible, its presence depends on the keyboard, and users type
 *    `دارایی‌ها` and `داراییها` interchangeably; storage is untouched, so the
 *    display text keeps what the author wrote;
 * 6. Persian (`۰`–`۹`) and Arabic-Indic (`٠`–`٩`) digits → ASCII `0`–`9`;
 * 7. Latin and all other cased letters are folded with locale-independent
 *    Unicode default case mapping, so `Cash` matches `cash` (never
 *    `toLocaleLowerCase`, which would make the result depend on the host
 *    locale — notably Turkish dotted/dotless `i`);
 * 8. Unicode White_Space characters and `U+FEFF` become ordinary spaces, runs
 *    collapse to one space, and surrounding space is trimmed.
 *
 * No other letter is changed: `ة`/`ه` and `أ`/`ا` are meaningfully different in
 * account and item names, so the agreed rules leave them to the author.
 *
 * The function is pure and deterministic: it reads no environment, locale,
 * clock or database, and normalizing an already normalized value returns the
 * same value (idempotence). These rules are a shared contract — changing them
 * after normalized values have been persisted requires re-normalizing those
 * values.
 */

/** Arabic yeh `ي` and alef maksura `ى`, both folded to Persian yeh `ی`. */
const ARABIC_YEH_PATTERN = /[\u064A\u0649]/g;
/** Arabic kaf `ك`, folded to Persian keheh `ک`. */
const ARABIC_KAF_PATTERN = /\u0643/g;
/** Combining marks attached to Arabic-script letters (fatha, kasra, shadda, …). */
const ARABIC_DIACRITIC_PATTERN = /(?=\p{Script_Extensions=Arabic})\p{M}/gu;
/** Tatweel (kashida), a purely decorative elongation. */
const TATWEEL_PATTERN = /\u0640/g;
/** Zero-width non-joiner; removed by decision (see the module comment). */
const ZWNJ_PATTERN = /\u200C/g;
/** Every Unicode White_Space character, plus the zero-width no-break space. */
const WHITESPACE_PATTERN = /[\p{White_Space}\uFEFF]+/gu;

/** First and last code points of the Persian and Arabic-Indic digit blocks. */
const PERSIAN_DIGIT_START = 0x06f0;
const PERSIAN_DIGIT_END = 0x06f9;
const ARABIC_INDIC_DIGIT_START = 0x0660;
const ARABIC_INDIC_DIGIT_END = 0x0669;

/**
 * The canonical form of `input`, used for comparing Persian text.
 *
 * An empty or whitespace-only value normalizes to `''`. A non-string value is
 * treated as empty rather than throwing, because callers receive values from
 * untrusted request data.
 */
export function normalizePersianSearch(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return foldDigits(
    input
      .normalize('NFC')
      .replace(ARABIC_YEH_PATTERN, '\u06CC')
      .replace(ARABIC_KAF_PATTERN, '\u06A9')
      .replace(ARABIC_DIACRITIC_PATTERN, '')
      .replace(TATWEEL_PATTERN, '')
      .replace(ZWNJ_PATTERN, '')
      .toLowerCase()
      .replace(WHITESPACE_PATTERN, ' ')
      .trim(),
  );
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

/** Folds Persian (`۰`–`۹`) and Arabic-Indic (`٠`–`٩`) digits to ASCII `0`–`9`. */
function foldDigits(value: string): string {
  let folded = '';
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint >= PERSIAN_DIGIT_START && codePoint <= PERSIAN_DIGIT_END) {
      folded += String(codePoint - PERSIAN_DIGIT_START);
      continue;
    }
    if (codePoint >= ARABIC_INDIC_DIGIT_START && codePoint <= ARABIC_INDIC_DIGIT_END) {
      folded += String(codePoint - ARABIC_INDIC_DIGIT_START);
      continue;
    }
    folded += character;
  }
  return folded;
}
