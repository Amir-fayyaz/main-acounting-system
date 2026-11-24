export interface JalaliDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_START_DAY_OFFSETS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const MODERN_ERA_OFFSET = 1600;
const JALALI_OFFSET_FOR_MODERN_ERA = 979;
const DAYS_PER_CYCLE = 12053;
const DAYS_PER_FOUR_YEARS = 1461;
const DAYS_PER_YEAR = 365;
const FIRST_HALF_MONTH_DAYS = 31;
const SECOND_HALF_MONTH_DAYS = 30;
const FIRST_HALF_DAY_COUNT = 186;

function padTwo(value: number): string {
  return String(value).padStart(2, '0');
}

export function gregorianToJalali(year: number, month: number, day: number): JalaliDate {
  let jalaliYear = year <= MODERN_ERA_OFFSET ? 0 : JALALI_OFFSET_FOR_MODERN_ERA;
  const gregorianYear = year - (year <= MODERN_ERA_OFFSET ? 621 : MODERN_ERA_OFFSET);
  const leapYearBasis = month > 2 ? gregorianYear + 1 : gregorianYear;

  let days =
    DAYS_PER_YEAR * gregorianYear +
    Math.trunc((leapYearBasis + 3) / 4) -
    Math.trunc((leapYearBasis + 99) / 100) +
    Math.trunc((leapYearBasis + 399) / 400) -
    80 +
    day +
    MONTH_START_DAY_OFFSETS[month - 1];

  jalaliYear += 33 * Math.trunc(days / DAYS_PER_CYCLE);
  days %= DAYS_PER_CYCLE;
  jalaliYear += 4 * Math.trunc(days / DAYS_PER_FOUR_YEARS);
  days %= DAYS_PER_FOUR_YEARS;

  if (days > DAYS_PER_YEAR) {
    jalaliYear += Math.trunc((days - 1) / DAYS_PER_YEAR);
    days = (days - 1) % DAYS_PER_YEAR;
  }

  const isFirstHalf = days < FIRST_HALF_DAY_COUNT;

  return {
    year: jalaliYear,
    month: isFirstHalf
      ? 1 + Math.trunc(days / FIRST_HALF_MONTH_DAYS)
      : 7 + Math.trunc((days - FIRST_HALF_DAY_COUNT) / SECOND_HALF_MONTH_DAYS),
    day: isFirstHalf
      ? 1 + (days % FIRST_HALF_MONTH_DAYS)
      : 1 + ((days - FIRST_HALF_DAY_COUNT) % SECOND_HALF_MONTH_DAYS),
  };
}

export function toJalaliDate(isoDate: string): JalaliDate | null {
  const match = ISO_DATE_PATTERN.exec(isoDate);
  if (!match) return null;

  const [, year, month, day] = match;

  return gregorianToJalali(Number(year), Number(month), Number(day));
}

export function formatJalaliDate(isoDate: string): string {
  const jalali = toJalaliDate(isoDate);
  if (!jalali) return isoDate;

  return `${jalali.year}/${padTwo(jalali.month)}/${padTwo(jalali.day)}`;
}
