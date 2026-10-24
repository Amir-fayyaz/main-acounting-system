import { expect, describe, it } from 'vitest';

import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { BusinessDate } from './business-date.js';
import {
  businessDateFromJalali,
  businessDateFromMillis,
  businessDateToJalali,
  DEFAULT_BUSINESS_TIME_ZONE,
  isJalaliLeapYear,
  jalaliDaysInMonth,
  jalaliMonthBounds,
  type JalaliDate,
  jalaliYearBounds,
} from './jalali-calendar.js';

const gregorian = (year: number, month: number, day: number): BusinessDate =>
  BusinessDate.of(year, month, day);

const jalaliIso = (date: JalaliDate): string =>
  `${date.jYear}-${String(date.jMonth).padStart(2, '0')}-${String(date.jDay).padStart(2, '0')}`;

// Independent oracle for cross-checking the module against ICU (CLDR's persian
// calendar; this is *not* the module's algorithm, it is Node's timezone
// database codepath); ICU formatToParts at UTC maps a civil day one-to-one.
const ICU_PERSIAN_FORMAT = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function icuPersian(date: BusinessDate): JalaliDate {
  const parts = new Map<string, string>();
  for (const part of ICU_PERSIAN_FORMAT.formatToParts(
    new Date(Date.UTC(date.year, date.month - 1, date.day)),
  )) {
    parts.set(part.type, part.value);
  }
  return {
    jYear: Number(parts.get('year')),
    jMonth: Number(parts.get('month')),
    jDay: Number(parts.get('day')),
  };
}

describe('Jalali conversion reference table', () => {
  // Known Gregorian ↔ Jalali pairs across several decades, chosen from public
  // calendars: the Unix epoch, the Islamic Revolution (22 Bahman 1357), one
  // Nawruz per era, a leap Esfand and this project's own day.
  it.each([
    ['1970-01-01', 1348, 10, 11],
    ['1979-02-11', 1357, 11, 22], // Islamic Revolution, 22 Bahman 1357
    ['1979-03-21', 1358, 1, 1],
    ['1987-03-21', 1366, 1, 1], // Nowruz 1987
    ['2012-03-20', 1391, 1, 1], // Nowruz 2012
    ['1996-03-20', 1375, 1, 1],
    ['1997-03-20', 1375, 12, 30],
    ['1997-03-21', 1376, 1, 1],
    ['2021-03-20', 1399, 12, 30],
    ['2021-03-21', 1400, 1, 1],
    ['2022-03-21', 1401, 1, 1],
    ['2024-03-20', 1403, 1, 1],
    ['2025-03-20', 1403, 12, 30],
    ['2025-03-21', 1404, 1, 1],
    ['2026-03-21', 1405, 1, 1],
    ['2026-03-20', 1404, 12, 29],
    ['2026-10-23', 1405, 8, 1],
    // Beyond 1410 and before 1370, sourced from ICU (CLDR persian calendar)
    // cross-checked against published Nowruz dates:
    ['2031-03-21', 1410, 1, 1],
    ['2032-03-20', 1411, 1, 1],
    ['2033-03-20', 1412, 1, 1],
  ])('converts %s to Jalali %i-%i-%i', (iso, jYear, jMonth, jDay) => {
    const [year, month, day] = iso.split('-').map(Number);
    expect(businessDateToJalali(gregorian(year, month, day))).toEqual({ jYear, jMonth, jDay });
  });

  it('converts Jalali to Gregorian and agrees both ways on the reference table', () => {
    const pairs: Array<[string, readonly [number, number, number]]> = [
      ['1970-01-01', [1348, 10, 11]],
      ['1979-02-11', [1357, 11, 22]],
      ['1996-03-20', [1375, 1, 1]],
      ['1997-03-20', [1375, 12, 30]],
      ['2025-03-20', [1403, 12, 30]],
      ['2025-03-21', [1404, 1, 1]],
      ['2026-03-21', [1405, 1, 1]],
      ['2026-10-23', [1405, 8, 1]],
    ];
    for (const [iso, [jYear, jMonth, jDay]] of pairs) {
      const date = businessDateFromJalali(jYear, jMonth, jDay);
      expect(date.toIsoString()).toBe(iso);
      expect(businessDateToJalali(date)).toEqual({ jYear, jMonth, jDay });
    }
  });

  it('rejects an impossible Jalali date instead of normalizing it', () => {
    expect(() => businessDateFromJalali(1405, 12, 30)).toThrow(InvalidPrimitiveError);
    expect(() => businessDateFromJalali(1405, 13, 1)).toThrow(InvalidPrimitiveError);
    expect(() => businessDateFromJalali(1405, 8, 31)).toThrow(InvalidPrimitiveError);
    expect(() => businessDateFromJalali(1405, 0, 1)).toThrow(InvalidPrimitiveError);
  });
});

describe('Jalali leap years and month lengths', () => {
  it.each([[1399], [1403], [1408], [1375]])('treats %i as a leap year', (jYear) => {
    expect(isJalaliLeapYear(jYear)).toBe(true);
  });

  it.each([[1400], [1402], [1404], [1405]])('treats %i as a common year', (jYear) => {
    expect(isJalaliLeapYear(jYear)).toBe(false);
  });

  it('gives 31 days to the first six months and 30 to months 7-11', () => {
    for (const jYear of [1403, 1404, 1405]) {
      for (let jMonth = 1; jMonth <= 6; jMonth++) {
        expect(jalaliDaysInMonth(jYear, jMonth)).toBe(31);
      }
      for (let jMonth = 7; jMonth <= 11; jMonth++) {
        expect(jalaliDaysInMonth(jYear, jMonth)).toBe(30);
      }
    }
  });

  it('gives Esfand 30 days exactly in leap years and 29 otherwise', () => {
    expect(jalaliDaysInMonth(1403, 12)).toBe(30);
    expect(jalaliDaysInMonth(1399, 12)).toBe(30);
    expect(jalaliDaysInMonth(1408, 12)).toBe(30);
    expect(jalaliDaysInMonth(1404, 12)).toBe(29);
    expect(jalaliDaysInMonth(1405, 12)).toBe(29);
  });

  it('rejects an out-of-range month', () => {
    expect(() => jalaliDaysInMonth(1405, 0)).toThrow(InvalidPrimitiveError);
    expect(() => jalaliDaysInMonth(1405, 13)).toThrow(InvalidPrimitiveError);
  });
});

describe('Jalali year and month boundaries', () => {
  it('starts and ends the year on the civil days the Nawruz rule dictates', () => {
    expect(jalaliYearBounds(1405).start.toIsoString()).toBe('2026-03-21');
    expect(jalaliYearBounds(1405).end.toIsoString()).toBe('2027-03-20');
    expect(jalaliYearBounds(1403).start.toIsoString()).toBe('2024-03-20');
    expect(jalaliYearBounds(1403).end.toIsoString()).toBe('2025-03-20');
    expect(jalaliYearBounds(1404).end.toIsoString()).toBe('2026-03-20');
  });

  it('starts a Jalali year one civil day after the previous one ends', () => {
    for (let jYear = 1398; jYear <= 1408; jYear++) {
      expect(jalaliYearBounds(jYear + 1).start.diffDays(jalaliYearBounds(jYear).end)).toBe(1);
    }
  });

  it('bounds a month by its length', () => {
    const aban = jalaliMonthBounds(1405, 8);
    expect(aban.start.toIsoString()).toBe('2026-10-23');
    expect(aban.end.toIsoString()).toBe('2026-11-21');
    const esfand = jalaliMonthBounds(1403, 12);
    expect(esfand.start.toIsoString()).toBe('2025-02-19');
    expect(esfand.end.toIsoString()).toBe('2025-03-20');
  });
});

describe('business-date rule', () => {
  it('assigns an instant to the day it falls on in the business timezone, never its UTC day', () => {
    // Midnight Tehran on Nawruz 1405 is still 2026-03-20 in UTC.
    const nawruzMoment = Date.parse('2026-03-20T20:30:00.000Z');
    const business = businessDateFromMillis(nawruzMoment);
    expect(business.toIsoString()).toBe('2026-03-21');
    expect(BusinessDate.fromUtcMillis(nawruzMoment).toIsoString()).toBe('2026-03-20');
    expect(businessDateToJalali(business)).toEqual({ jYear: 1405, jMonth: 1, jDay: 1 });
    // One millisecond before midnight Tehran is still the previous civil day,
    // the last day of common year 1404.
    expect(businessDateFromMillis(nawruzMoment - 1).toIsoString()).toBe('2026-03-20');
    expect(businessDateToJalali(businessDateFromMillis(nawruzMoment - 1))).toEqual({
      jYear: 1404,
      jMonth: 12,
      jDay: 29,
    });
    // The same instant elsewhere is NOT the Tehran business day.
    expect(businessDateFromMillis(nawruzMoment, 'America/Los_Angeles').toIsoString()).toBe(
      '2026-03-20',
    );
    expect(businessDateFromMillis(nawruzMoment, 'UTC').toIsoString()).toBe('2026-03-20');
  });

  it('uses the tz database rules historically, including pre-2022 Tehran daylight saving time', () => {
    // Summer 2021: Tehran observed DST, UTC+04:30 (base +03:30 + 1h), while
    // Los Angeles was UTC-07:00 (PDT) — five hours apart, and neither is UTC.
    // Midnight Tehran (2021-06-22) = 2021-06-21T19:30:00Z.
    const momentMidnight = Date.parse('2021-06-21T19:30:00.000Z');
    const tehran = businessDateFromMillis(momentMidnight);
    const losAngeles = businessDateFromMillis(momentMidnight, 'America/Los_Angeles');
    expect(tehran.toIsoString()).toBe('2021-06-22');
    expect(losAngeles.toIsoString()).toBe('2021-06-21');
    // One millisecond before midnight Tehran is still the previous civil day.
    expect(businessDateFromMillis(momentMidnight - 1).toIsoString()).toBe('2021-06-21');
  });

  it('survives the +03:30 half-hour offset without drift', () => {
    // 03:59:59 Tehran and 04:00:00 Tehran are the same civil day.
    const justBefore = Date.parse('2026-10-23T00:29:59.000Z');
    expect(businessDateFromMillis(justBefore).toIsoString()).toBe('2026-10-23');
    expect(businessDateFromMillis(justBefore + 1_000).toIsoString()).toBe('2026-10-23');
    // An instant whose UTC day is 22 Oct is 23 Oct where the business happens.
    expect(businessDateFromMillis(Date.parse('2026-10-22T21:30:00.000Z')).toIsoString()).toBe(
      '2026-10-23',
    );
  });

  it('refuses an unknown timezone name instead of falling back to the server zone', () => {
    expect(() => businessDateFromMillis(0, 'Not/AZone')).toThrow(InvalidPrimitiveError);
    expect(() => businessDateFromMillis(0, '')).toThrow(InvalidPrimitiveError);
  });

  it('uses Asia/Tehran as the product default', () => {
    expect(DEFAULT_BUSINESS_TIME_ZONE).toBe('Asia/Tehran');
  });
});

describe('round trip: Gregorian → Jalali → Gregorian', () => {
  it('returns the original date for every civil day of 1970–2100', () => {
    const epoch = gregorian(1970, 1, 1);
    const start = epoch.diffDays(epoch);
    const end = gregorian(2100, 12, 31).diffDays(epoch);
    const failures: string[] = [];
    for (let day = start; day <= end; day++) {
      const date = epoch.addDays(day);
      const { jYear, jMonth, jDay } = businessDateToJalali(date);
      const back = businessDateFromJalali(jYear, jMonth, jDay);
      if (!back.equals(date)) {
        failures.push(date.toIsoString());
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('round trip: Jalali → Gregorian → Jalali', () => {
  it('returns the original Jalali date across Jalali years 1348–1480, at every month end', () => {
    // Every month of every year in the range, plus the leap-year Esfand edge;
    // earlier days of a month follow from the same arithmetic once the month
    // end round-trips, but the 30-Esfand case is probed explicitly too.
    const probes: Array<[number, number, number]> = [];
    for (let jYear = 1348; jYear <= 1480; jYear++) {
      for (let jMonth = 1; jMonth <= 12; jMonth++) {
        const end = jalaliDaysInMonth(jYear, jMonth);
        probes.push([jYear, jMonth, 1], [jYear, jMonth, end]);
      }
    }
    const failures: string[] = [];
    for (const [jYear, jMonth, jDay] of probes) {
      const back = businessDateToJalali(businessDateFromJalali(jYear, jMonth, jDay));
      if (back.jYear !== jYear || back.jMonth !== jMonth || back.jDay !== jDay) {
        failures.push(`${jYear}-${jalaliIso(back)}`);
      }
    }
    expect(failures).toEqual([]);
    expect(probes.length).toBe(12 * (1480 - 1348 + 1) * 2);
  });
});

describe('round trip: every Jalali day of 1380–1450, both directions', () => {
  it('returns the original Jalali date after Gregorian conversion and back, day by day', () => {
    const expected: Array<[number, number, number]> = [];
    for (let jYear = 1380; jYear <= 1450; jYear++) {
      for (let jMonth = 1; jMonth <= 12; jMonth++) {
        for (let jDay = 1; jDay <= jalaliDaysInMonth(jYear, jMonth); jDay++) {
          expected.push([jYear, jMonth, jDay]);
        }
      }
    }
    expect(expected.length).toBeGreaterThan(25_000);
    const failures: string[] = [];
    for (const [jYear, jMonth, jDay] of expected) {
      const back = businessDateToJalali(businessDateFromJalali(jYear, jMonth, jDay));
      if (back.jYear !== jYear || back.jMonth !== jMonth || back.jDay !== jDay) {
        failures.push(`${jYear}-${jalaliIso(back)}`);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('ICU (CLDR persian calendar) oracle, Jalali 1300–1500', () => {
  it('agrees with ICU on the reference-table dates', () => {
    const pairs: Array<readonly [number, number, number]> = [
      [1348, 10, 11],
      [1357, 11, 22],
      [1375, 12, 30],
      [1403, 12, 30],
      [1404, 12, 29],
      [1405, 1, 1],
      [1410, 1, 1],
      [1411, 1, 1],
      [1412, 1, 1],
    ];
    for (const [jYear, jMonth, jDay] of pairs) {
      expect(icuPersian(businessDateFromJalali(jYear, jMonth, jDay))).toEqual({
        jYear,
        jMonth,
        jDay,
      });
    }
  });

  it('agrees with ICU on every Jalali day from 1300-01-01 to 1500-12-29', () => {
    // Compare each module conversion against ICU's independent persian
    // calendar. The reference-table tests above remain the authority if the
    // two ever disagree; this suite surfaces such days instead of hiding them.
    const mismatches: string[] = [];
    for (let jYear = 1300; jYear <= 1500; jYear++) {
      for (let jMonth = 1; jMonth <= 12; jMonth++) {
        for (let jDay = 1; jDay <= jalaliDaysInMonth(jYear, jMonth); jDay++) {
          const gregorianDate = businessDateFromJalali(jYear, jMonth, jDay);
          const icu = icuPersian(gregorianDate);
          if (icu.jYear !== jYear || icu.jMonth !== jMonth || icu.jDay !== jDay) {
            mismatches.push(
              `${jYear}-${jalaliIso({ jYear, jMonth, jDay })} -> ` +
                `${gregorianDate.toIsoString()}, ICU says ${jalaliIso(icu)}`,
            );
          }
        }
      }
    }
    expect(mismatches).toEqual([]);
  }, 120_000);
});

describe('leap rule and period tiling, Jalali 1300–1500', () => {
  it('gives Esfand 30 days exactly when isJalaliLeapYear says so', () => {
    for (let jYear = 1300; jYear <= 1500; jYear++) {
      expect(jalaliDaysInMonth(jYear, 12)).toBe(isJalaliLeapYear(jYear) ? 30 : 29);
    }
  });

  it('spans years of 365 or 366 days', () => {
    for (let jYear = 1300; jYear <= 1500; jYear++) {
      const { start, end } = jalaliYearBounds(jYear);
      const span = end.diffDays(start) + 1;
      expect([365, 366]).toContain(span);
      expect(span === 366).toBe(isJalaliLeapYear(jYear));
    }
  });

  it('keeps consecutive years contiguous: no gap and no overlap', () => {
    for (let jYear = 1300; jYear < 1500; jYear++) {
      expect(jalaliYearBounds(jYear + 1).start.diffDays(jalaliYearBounds(jYear).end)).toBe(1);
    }
  });

  it('tiles a year exactly with its 12 month bounds', () => {
    for (const jYear of [1300, 1399, 1403, 1404, 1412, 1450, 1500]) {
      const { end: yearEnd } = jalaliYearBounds(jYear);
      let covered = 0;
      for (let jMonth = 1; jMonth <= 12; jMonth++) {
        const { start, end } = jalaliMonthBounds(jYear, jMonth);
        if (jMonth > 1) {
          expect(start.diffDays(jalaliMonthBounds(jYear, jMonth - 1).end)).toBe(1);
        }
        covered += end.diffDays(start) + 1;
      }
      expect(covered).toBe(yearEnd.diffDays(jalaliYearBounds(jYear).start) + 1);
      expect(jalaliMonthBounds(jYear, 12).end.equals(yearEnd)).toBe(true);
    }
  });
});

describe('input validation', () => {
  it('rejects an invalid or out-of-range Jalali year everywhere it is asked', () => {
    expect(() => jalaliDaysInMonth(99999, 1)).toThrow(InvalidPrimitiveError);
    expect(() => jalaliDaysInMonth(0, 1)).toThrow(InvalidPrimitiveError);
    expect(() => jalaliDaysInMonth(3178, 12)).toThrow(InvalidPrimitiveError);
    expect(() => businessDateFromJalali(0, 1, 1)).toThrow(InvalidPrimitiveError);
    expect(() => jalaliMonthBounds(99999, 1)).toThrow(InvalidPrimitiveError);
    expect(() => jalaliYearBounds(99999)).toThrow(InvalidPrimitiveError);
    // Boundary value of the documented year range is accepted.
    expect(jalaliDaysInMonth(3177, 1)).toBe(31);
  });

  it('rejects day 31 in month 7 and Esfand 30 in a common year', () => {
    expect(() => businessDateFromJalali(1404, 7, 31)).toThrow(InvalidPrimitiveError);
    expect(() => businessDateFromJalali(1404, 12, 30)).toThrow(InvalidPrimitiveError);
  });

  it('rejects non-finite or out-of-range millis instead of leaking a RangeError', () => {
    expect(() => businessDateFromMillis(Number.NaN)).toThrow(InvalidPrimitiveError);
    expect(() => businessDateFromMillis(Number.POSITIVE_INFINITY)).toThrow(InvalidPrimitiveError);
    expect(() => businessDateFromMillis(Number.NEGATIVE_INFINITY)).toThrow(InvalidPrimitiveError);
    expect(() => businessDateFromMillis(8.64e15 + 1)).toThrow(InvalidPrimitiveError);
    expect(() => businessDateFromMillis(-8.64e15 - 1)).toThrow(InvalidPrimitiveError);
    expect(() => businessDateFromMillis(1e20)).toThrow(InvalidPrimitiveError);
    // Even within the JS Date range, instants whose civil day falls outside the
    // kernel's 1..9999 year range are rejected rather than silent garbage.
    expect(() => businessDateFromMillis(8.64e15)).toThrow(InvalidPrimitiveError);
    expect(() => businessDateFromMillis(-8.64e15)).toThrow(InvalidPrimitiveError);
    // The newest representable instant stays valid.
    expect(businessDateFromMillis(Date.parse('9999-12-31T20:29:59.999Z')).toIsoString()).toBe(
      '9999-12-31',
    );
  });

  it('rejects an unknown timezone name and never caches it', () => {
    expect(() => businessDateFromMillis(0, 'Not/AZone')).toThrow(InvalidPrimitiveError);
    expect(() => businessDateFromMillis(0, '')).toThrow(InvalidPrimitiveError);
    expect(() => businessDateFromMillis(0, 'Local/Time')).toThrow(InvalidPrimitiveError);
  });
});

describe('formatter cache', () => {
  it('constructs one Intl.DateTimeFormat per timezone and reuses it', () => {
    // A timezone no other test uses, so unrelated calls cannot pollute the count.
    const tehranAlternate = 'Asia/Singapore';
    const original = Intl.DateTimeFormat;
    const constructions: string[] = [];
    // Vitest's spyOn wrapper is not constructible, so the property is swapped
    // for a plain constructible counting wrapper and restored afterwards.
    const stub = function (...args: unknown[]) {
      const options = args[1] as Intl.DateTimeFormatOptions | undefined;
      constructions.push(String(options?.timeZone));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return Reflect.construct(original as any, args as any[]);
    };
    Object.defineProperty(Intl, 'DateTimeFormat', {
      configurable: true,
      writable: true,
      value: stub,
    });
    try {
      const instant = Date.parse('2026-04-01T00:00:00Z');
      expect(businessDateFromMillis(instant, tehranAlternate)).toBeInstanceOf(BusinessDate);
      expect(businessDateFromMillis(instant, tehranAlternate)).toBeInstanceOf(BusinessDate);
      expect(constructions.filter((t) => t === tehranAlternate)).toHaveLength(1);
      // A failed construction is not cached: the second attempt builds again.
      expect(() => businessDateFromMillis(instant, 'NoSuch/Zone')).toThrow(InvalidPrimitiveError);
      expect(() => businessDateFromMillis(instant, 'NoSuch/Zone')).toThrow(InvalidPrimitiveError);
      expect(constructions.filter((t) => t === 'NoSuch/Zone')).toHaveLength(2);
    } finally {
      Object.defineProperty(Intl, 'DateTimeFormat', {
        configurable: true,
        writable: true,
        value: original,
      });
    }
  });
});
