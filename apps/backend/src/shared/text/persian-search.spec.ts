import { execFileSync } from 'node:child_process';
import { env } from 'node:process';

import { describe, expect, it } from 'vitest';

import { matchesPersianSearch, normalizePersianSearch } from './persian-search.js';

/**
 * The reference table (S2). Every row is written by hand from the agreed rules,
 * never captured from the implementation's own output: it is the contract the
 * shared module has to satisfy, and the place a reviewer checks when a rule is
 * questioned.
 *
 * Invisible input characters are spelled as escapes on purpose — a literal ZWNJ
 * or non-breaking space in source is too easy to lose in review.
 */
const REFERENCE_TABLE: ReadonlyArray<readonly [label: string, input: string, expected: string]> = [
  // Letter variants: the agreed folds.
  ['Arabic yeh to Persian yeh', 'دارايي', 'دارایی'],
  ['Alef maksura to Persian yeh', 'موسى', 'موسی'],
  ['Arabic kaf to Persian keheh', 'بانك', 'بانک'],
  ['Both letter variants in one value', 'كيفيت دارايي', 'کیفیت دارایی'],
  ['Decomposed alef-hamza matches the precomposed letter', '\u0627\u0654حمد', 'أحمد'],
  // Letters the agreed rules deliberately leave distinct.
  ['Leaves ta marbuta untouched', 'مدرسة', 'مدرسة'],
  ['Leaves heh untouched', 'خانه', 'خانه'],

  // Tatweel and diacritics.
  ['Removes tatweel', 'کتـــاب', 'کتاب'],
  ['Removes Arabic diacritics', 'حَساب', 'حساب'],
  ['Removes shadda and fatha', 'مُحَمَّد', 'محمد'],

  // Digits: both Persian and Arabic-Indic blocks, alone and mixed.
  ['Persian digits to ASCII', '۰۱۲۳۴۵۶۷۸۹', '0123456789'],
  ['Arabic-Indic digits to ASCII', '٠١٢٣٤٥٦٧٨٩', '0123456789'],
  ['Mixed Persian, Arabic-Indic and ASCII digits', 'کد ۱۲-٣٤-56', 'کد 12-34-56'],

  // Whitespace.
  ['Trims surrounding space', '  بانک ملت  ', 'بانک ملت'],
  ['Collapses runs of whitespace', 'بانک \t\n  ملت', 'بانک ملت'],
  ['Maps non-breaking space to a space', 'بانک\u00A0ملت', 'بانک ملت'],
  ['Maps zero-width no-break space to a space', '\uFEFFبانک ملت\uFEFF', 'بانک ملت'],

  // ZWNJ decision (recorded in the module comment): removed for comparison.
  ['Removes zero-width non-joiner', 'دارایی\u200Cها', 'داراییها'],
  ['A removed ZWNJ never leaves a double space', 'بانک\u200C ملت', 'بانک ملت'],

  // Latin case folding.
  ['Folds Latin case', 'Cash Account', 'cash account'],
  ['Folds ASCII Latin without locale rules', 'ISTANBUL', 'istanbul'],
  ['Folds mixed Persian and Latin', 'کد CASH-۱۲۳', 'کد cash-123'],

  // Everything at once.
  ['Applies every rule to one value', '  بانك   ملّى ۱۲۳  ', 'بانک ملی 123'],

  // Empty inputs.
  ['Empty stays empty', '', ''],
  ['Whitespace-only becomes empty', ' \t\n\u00A0\u200C ', ''],
];

const SAMPLES = REFERENCE_TABLE.map(([, input]) => input);
const EXPECTED = REFERENCE_TABLE.map(([, , expected]) => expected);

describe('normalizePersianSearch reference table', () => {
  it.each(REFERENCE_TABLE)('%s', (_label, input, expected) => {
    expect(normalizePersianSearch(input)).toBe(expected);
  });
});

describe('normalizePersianSearch invariants', () => {
  it('is idempotent for every reference input', () => {
    for (const [label, input] of REFERENCE_TABLE) {
      const once = normalizePersianSearch(input);
      expect(normalizePersianSearch(once), label).toBe(once);
    }
  });

  it('does not depend on the Turkish locale case rules', () => {
    // The trap: under Turkish rules `I` folds to a dotless `ı`, not `i`.
    expect('ISTANBUL'.toLocaleLowerCase('tr')).toBe('ıstanbul');
    expect(normalizePersianSearch('ISTANBUL')).toBe('istanbul');
  });

  it('returns an empty value for non-string input from untrusted data', () => {
    expect(normalizePersianSearch(undefined as unknown as string)).toBe('');
    expect(normalizePersianSearch(null as unknown as string)).toBe('');
    expect(normalizePersianSearch(42 as unknown as string)).toBe('');
  });

  it('handles an empty value', () => {
    expect(normalizePersianSearch('')).toBe('');
  });

  it('handles a whitespace-only value', () => {
    expect(normalizePersianSearch('   \t\r\n\u00A0\u2003\uFEFF   ')).toBe('');
  });

  it('handles a very long value without changing the rules', () => {
    const repetitions = 20_000;
    const input = 'بانك ۱۲۳ '.repeat(repetitions);
    const expected = 'بانک 123 '.repeat(repetitions).trim();

    expect(normalizePersianSearch(input)).toBe(expected);
    expect(normalizePersianSearch(normalizePersianSearch(input))).toBe(expected);
  });
});

describe('normalizePersianSearch determinism', () => {
  const moduleUrl = new URL('./persian-search.ts', import.meta.url).href;

  function normalizeInChildProcess(environment: Record<string, string>): string {
    const script = `
      const { normalizePersianSearch } = await import(${JSON.stringify(moduleUrl)});
      const samples = ${JSON.stringify(SAMPLES)};
      process.stdout.write(JSON.stringify(samples.map(normalizePersianSearch)));
    `;

    return execFileSync(process.execPath, ['--no-warnings', '--input-type=module', '-e', script], {
      encoding: 'utf8',
      env: { ...env, ...environment },
    });
  }

  it.each([
    ['UTC with the C locale', { TZ: 'UTC', LANG: 'C', LC_ALL: 'C' }],
    [
      'Asia/Tehran with a Turkish locale',
      { TZ: 'Asia/Tehran', LANG: 'tr_TR.UTF-8', LC_ALL: 'tr_TR.UTF-8' },
    ],
  ])('produces the same canonical values under %s', (_label, environment) => {
    const output = JSON.parse(normalizeInChildProcess(environment)) as string[];
    expect(output).toEqual(EXPECTED);
  });

  it('agrees with the in-process result under every environment', () => {
    const environments = [
      { TZ: 'UTC', LANG: 'C', LC_ALL: 'C' },
      { TZ: 'Asia/Tehran', LANG: 'tr_TR.UTF-8', LC_ALL: 'tr_TR.UTF-8' },
    ];

    for (const environment of environments) {
      const output = JSON.parse(normalizeInChildProcess(environment)) as string[];
      expect(output).toEqual(SAMPLES.map(normalizePersianSearch));
    }
  });
});

describe('matchesPersianSearch', () => {
  it('matches a name written with a different yeh and kaf', () => {
    expect(matchesPersianSearch('حساب‌های دریافتنی', 'دريافتنى')).toBe(true);
    expect(matchesPersianSearch('بانک ملت', 'بانك')).toBe(true);
  });

  it('matches a code written with Persian or Arabic-Indic digits', () => {
    expect(matchesPersianSearch('110101', '۱۱۰۱۰۱')).toBe(true);
    expect(matchesPersianSearch('110101', '١١٠١٠١')).toBe(true);
  });

  it('matches a name whose ZWNJ the user typed as nothing', () => {
    expect(matchesPersianSearch('دارایی\u200Cها', 'داراییها')).toBe(true);
  });

  it('treats an empty needle as matching everything', () => {
    expect(matchesPersianSearch('anything', '')).toBe(true);
    expect(matchesPersianSearch('anything', '   ')).toBe(true);
  });

  it('does not match an unrelated value', () => {
    expect(matchesPersianSearch('بانک ملت', 'صندوق')).toBe(false);
  });
});
