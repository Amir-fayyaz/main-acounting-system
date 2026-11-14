/**
 * Zero-dependency Jalali (Persian) calendar helpers.
 *
 * Contract used everywhere in the table:
 *   - UI shows Jalali ("۱۴۰۵/۰۷/۲۷")
 *   - Data, filters, URL and API always use Gregorian ISO date-only strings ("2026-10-19")
 *
 * Date-only values are handled with integer arithmetic (never `new Date('YYYY-MM-DD')`),
 * so there is no UTC/timezone off-by-one problem.
 */

export type IsoDate = string; // 'YYYY-MM-DD' (Gregorian)

export interface JalaliParts {
  jy: number;
  jm: number; // 1..12
  jd: number; // 1..31
}

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

/** Saturday-first, matching the Iranian week. */
export const JALALI_WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const;
export const JALALI_WEEKDAYS_LONG = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
] as const;

const G_CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

const div = (a: number, b: number) => Math.floor(a / b);

export function isGregorianLeap(gy: number): boolean {
  return (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
}

/** 33-year arithmetic rule (matches the official calendar for the modern range). */
export function isJalaliLeap(jy: number): boolean {
  const r = ((jy % 33) + 33) % 33;
  return r === 1 || r === 5 || r === 9 || r === 13 || r === 17 || r === 22 || r === 26 || r === 30;
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
}

export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliParts {
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    div(gy2 + 3, 4) -
    div(gy2 + 99, 100) +
    div(gy2 + 399, 400) +
    gd +
    G_CUM[gm - 1];
  let jy = -1595 + 33 * div(days, 12053);
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  const y = jy + 1595;
  let days =
    -355668 +
    365 * y +
    div(y, 33) * 8 +
    div((y % 33) + 3, 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    days -= 1;
    gy += 100 * div(days, 36524);
    days %= 36524;
    if (days >= 365) days += 1;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const months = [0, 31, isGregorianLeap(gy) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 13 && gd > months[gm]) {
    gd -= months[gm];
    gm += 1;
  }
  return [gy, gm, gd];
}

/* ------------------------------ ISO helpers ------------------------------ */

const pad = (n: number, len = 2) => String(n).padStart(len, '0');
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function makeIso(gy: number, gm: number, gd: number): IsoDate {
  return `${pad(gy, 4)}-${pad(gm)}-${pad(gd)}`;
}

export function parseIso(iso: string | null | undefined): [number, number, number] | null {
  if (!iso) return null;
  const m = ISO_RE.exec(iso.slice(0, 10));
  if (!m) return null;
  const gy = +m[1];
  const gm = +m[2];
  const gd = +m[3];
  if (gm < 1 || gm > 12 || gd < 1) return null;
  const len = [31, isGregorianLeap(gy) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][gm - 1];
  return gd <= len ? [gy, gm, gd] : null;
}

export function isValidIso(iso: string | null | undefined): iso is IsoDate {
  return parseIso(iso) !== null;
}

export function isoToJalali(iso: string | null | undefined): JalaliParts | null {
  const p = parseIso(iso);
  return p ? gregorianToJalali(p[0], p[1], p[2]) : null;
}

export function isValidJalali(jy: number, jm: number, jd: number): boolean {
  return (
    Number.isInteger(jy) &&
    Number.isInteger(jm) &&
    Number.isInteger(jd) &&
    jy >= 1 &&
    jy <= 9999 &&
    jm >= 1 &&
    jm <= 12 &&
    jd >= 1 &&
    jd <= jalaliMonthLength(jy, jm)
  );
}

export function jalaliToIso(jy: number, jm: number, jd: number): IsoDate | null {
  if (!isValidJalali(jy, jm, jd)) return null;
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  return makeIso(gy, gm, gd);
}

/** Day arithmetic on date-only values, done in UTC to avoid DST/timezone drift. */
export function addDays(iso: IsoDate, n: number): IsoDate {
  const p = parseIso(iso);
  if (!p) return iso;
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
  return makeIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** 0 = Saturday … 6 = Friday. */
export function jalaliWeekday(iso: IsoDate): number {
  const p = parseIso(iso);
  if (!p) return 0;
  const dow = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay(); // 0 = Sunday
  return (dow + 1) % 7;
}

/** Today as a Gregorian ISO date in the *local* timezone. */
export function todayIso(now: Date = new Date()): IsoDate {
  return makeIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function compareIso(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0; // ISO strings sort lexicographically
}

/* ------------------------------- digits ------------------------------- */

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function toFaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[+d]);
}

export function toEnDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
}

/* ------------------------------ formatting ------------------------------ */

export type JalaliFormat = 'numeric' | 'long' | 'short';

export interface FormatOptions {
  format?: JalaliFormat;
  /** Use Latin digits instead of Persian ones. */
  latinDigits?: boolean;
  weekday?: boolean;
  empty?: string;
}

/**
 * numeric → ۱۴۰۵/۰۷/۲۷
 * short   → ۲۷ مهر
 * long    → ۲۷ مهر ۱۴۰۵
 */
export function formatJalali(iso: string | null | undefined, opts: FormatOptions = {}): string {
  const { format = 'numeric', latinDigits = false, weekday = false, empty = '—' } = opts;
  const j = isoToJalali(iso);
  if (!j) return empty;
  let out: string;
  if (format === 'numeric') out = `${pad(j.jy, 4)}/${pad(j.jm)}/${pad(j.jd)}`;
  else if (format === 'short') out = `${j.jd} ${JALALI_MONTHS[j.jm - 1]}`;
  else out = `${j.jd} ${JALALI_MONTHS[j.jm - 1]} ${j.jy}`;
  if (weekday) out = `${JALALI_WEEKDAYS_LONG[jalaliWeekday(iso as IsoDate)]} ${out}`;
  return latinDigits ? out : toFaDigits(out);
}

/* -------------------------------- parsing -------------------------------- */

/**
 * Parses free-form user input into a Gregorian ISO date.
 * Accepts Persian/Arabic/Latin digits and `/ - . ٫ ،` separators.
 * Two-digit years are read as 14xx. Returns null if the input is not a valid Jalali date.
 */
export function parseJalaliInput(text: string | null | undefined): IsoDate | null {
  if (!text) return null;
  const clean = toEnDigits(text)
    .replace(/\s/g, '')
    .replace(/[-.٫،,\\]/g, '/');
  const m = /^(\d{2}|\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(clean);
  if (!m) return null;
  let jy = +m[1];
  if (m[1].length === 2) jy += 1400;
  return jalaliToIso(jy, +m[2], +m[3]);
}

/**
 * Progressive mask while typing: keeps digits only, shows Persian digits and
 * inserts "/" after the year and the month ("14050727" → "۱۴۰۵/۰۷/۲۷").
 */
export function maskJalaliTyping(text: string): string {
  const digits = toEnDigits(text).replace(/\D/g, '').slice(0, 8);
  let out = digits.slice(0, 4);
  if (digits.length > 4) out += '/' + digits.slice(4, 6);
  if (digits.length > 6) out += '/' + digits.slice(6, 8);
  return toFaDigits(out);
}

/* --------------------------- ranges and presets --------------------------- */

export interface IsoRange {
  from?: IsoDate;
  to?: IsoDate;
}

export function jalaliMonthRange(jy: number, jm: number): Required<IsoRange> {
  return {
    from: jalaliToIso(jy, jm, 1)!,
    to: jalaliToIso(jy, jm, jalaliMonthLength(jy, jm))!,
  };
}

export function jalaliYearRange(jy: number): Required<IsoRange> {
  return {
    from: jalaliToIso(jy, 1, 1)!,
    to: jalaliToIso(jy, 12, jalaliMonthLength(jy, 12))!,
  };
}

export interface DatePreset {
  id: string;
  label: string;
  range: (today: IsoDate) => Required<IsoRange>;
}

export const DATE_PRESETS: DatePreset[] = [
  { id: 'today', label: 'امروز', range: (t) => ({ from: t, to: t }) },
  { id: 'yesterday', label: 'دیروز', range: (t) => ({ from: addDays(t, -1), to: addDays(t, -1) }) },
  { id: 'last7', label: '۷ روز اخیر', range: (t) => ({ from: addDays(t, -6), to: t }) },
  { id: 'last30', label: '۳۰ روز اخیر', range: (t) => ({ from: addDays(t, -29), to: t }) },
  {
    id: 'thisWeek',
    label: 'این هفته',
    range: (t) => {
      const start = addDays(t, -jalaliWeekday(t));
      return { from: start, to: addDays(start, 6) };
    },
  },
  {
    id: 'thisMonth',
    label: 'این ماه',
    range: (t) => {
      const j = isoToJalali(t)!;
      return jalaliMonthRange(j.jy, j.jm);
    },
  },
  {
    id: 'lastMonth',
    label: 'ماه قبل',
    range: (t) => {
      const j = isoToJalali(t)!;
      return j.jm === 1 ? jalaliMonthRange(j.jy - 1, 12) : jalaliMonthRange(j.jy, j.jm - 1);
    },
  },
  { id: 'thisYear', label: 'امسال', range: (t) => jalaliYearRange(isoToJalali(t)!.jy) },
];

/** Human label for a range, e.g. "۱۴۰۵/۰۷/۰۱ تا ۱۴۰۵/۰۷/۳۰", or a single day. */
export function formatRangeLabel(range: IsoRange): string {
  const { from, to } = range;
  if (from && to && from === to) return formatJalali(from);
  if (from && to) return `${formatJalali(from)} تا ${formatJalali(to)}`;
  if (from) return `از ${formatJalali(from)}`;
  if (to) return `تا ${formatJalali(to)}`;
  return '';
}
