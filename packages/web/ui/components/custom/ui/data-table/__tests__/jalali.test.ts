import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addDays,
  formatJalali,
  gregorianToJalali,
  isJalaliLeap,
  isoToJalali,
  jalaliToIso,
  jalaliWeekday,
  maskJalaliTyping,
  parseIso,
  parseJalaliInput,
  toEnDigits,
  toFaDigits,
  makeIso,
  DATE_PRESETS,
} from '../date/jalali';

const fmt = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});
const icu = (y: number, m: number, d: number) => {
  const p = Object.fromEntries(
    fmt.formatToParts(new Date(Date.UTC(y, m - 1, d))).map((x) => [x.type, x.value]),
  );
  return { jy: +p.year, jm: +p.month, jd: +p.day };
};

test('matches ICU Persian calendar for every day 1921-01-01 … 2121-12-31', () => {
  let mismatches = 0;
  for (let t = Date.UTC(1921, 0, 1); t <= Date.UTC(2121, 11, 31); t += 864e5) {
    const d = new Date(t);
    const g = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()] as const;
    const mine = gregorianToJalali(...g);
    const ref = icu(...g);
    if (mine.jy !== ref.jy || mine.jm !== ref.jm || mine.jd !== ref.jd) {
      if (mismatches++ < 5) console.log('mismatch', g, mine, ref);
    }
  }
  assert.equal(mismatches, 0);
});

test('round trip Jalali -> ISO -> Jalali for years 1300..1500', () => {
  for (let jy = 1300; jy <= 1500; jy++)
    for (let jm = 1; jm <= 12; jm++) {
      const len = jm <= 6 ? 31 : jm <= 11 ? 30 : isJalaliLeap(jy) ? 30 : 29;
      for (let jd = 1; jd <= len; jd++) {
        const iso = jalaliToIso(jy, jm, jd)!;
        assert.deepEqual(isoToJalali(iso), { jy, jm, jd });
      }
    }
});

test('known anchors', () => {
  assert.equal(jalaliToIso(1405, 1, 1), '2026-03-21');
  assert.equal(jalaliToIso(1403, 12, 30), '2025-03-20'); // leap year
  assert.equal(jalaliToIso(1404, 12, 30), null); // not leap
  assert.equal(jalaliToIso(1400, 1, 1), '2021-03-21');
  assert.equal(formatJalali('2026-10-19'), '۱۴۰۵/۰۷/۲۷');
  assert.equal(formatJalali('2026-10-19', { format: 'long' }), '۲۷ مهر ۱۴۰۵');
  assert.equal(formatJalali(null), '—');
  assert.equal(formatJalali('garbage'), '—');
});

test('weekday: 2026-10-19 is Monday => Doshanbe (index 2)', () => {
  assert.equal(jalaliWeekday('2026-10-19'), 2);
  assert.equal(jalaliWeekday('2026-10-17'), 0); // Saturday
});

test('parse input: digits, separators, two-digit years, invalid', () => {
  assert.equal(parseJalaliInput('۱۴۰۵/۰۷/۲۷'), '2026-10-19');
  assert.equal(parseJalaliInput('1405-7-27'), '2026-10-19');
  assert.equal(parseJalaliInput('٠٥/٠٧/٢٧'), '2026-10-19');
  assert.equal(parseJalaliInput('1405/13/01'), null);
  assert.equal(parseJalaliInput('1405/07/32'), null);
  assert.equal(parseJalaliInput('1404/12/30'), null);
  assert.equal(parseJalaliInput('abc'), null);
  assert.equal(parseJalaliInput(''), null);
});

test('mask while typing', () => {
  assert.equal(maskJalaliTyping('1405'), '۱۴۰۵');
  assert.equal(maskJalaliTyping('14050'), '۱۴۰۵/۰');
  assert.equal(maskJalaliTyping('1405072'), '۱۴۰۵/۰۷/۲');
  assert.equal(maskJalaliTyping('۱۴۰۵۰۷۲۷۹۹'), '۱۴۰۵/۰۷/۲۷');
});

test('addDays crosses month/year/leap boundaries without timezone drift', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-03-29', 1), '2026-03-30');
  assert.equal(addDays('2026-10-19', -365), '2025-10-19');
});

test('parseIso validates', () => {
  assert.ok(parseIso('2026-02-29') === null);
  assert.ok(parseIso('2028-02-29') !== null);
  assert.ok(parseIso('2026-13-01') === null);
  assert.equal(makeIso(2026, 3, 5), '2026-03-05');
});

test('digits', () => {
  assert.equal(toFaDigits(1405), '۱۴۰۵');
  assert.equal(toEnDigits('۱۴۰۵٠١'), '140501');
});

test('presets: this month / last month / this week', () => {
  const t = '2026-10-19'; // 27 Mehr 1405
  const get = (id: string) => DATE_PRESETS.find((p) => p.id === id)!.range(t);
  assert.deepEqual(get('thisMonth'), { from: '2026-09-23', to: '2026-10-22' });
  assert.deepEqual(get('lastMonth'), { from: '2026-08-23', to: '2026-09-22' });
  assert.deepEqual(get('thisWeek'), { from: '2026-10-17', to: '2026-10-23' });
  assert.deepEqual(get('thisYear'), { from: '2026-03-21', to: '2027-03-20' });
  assert.deepEqual(DATE_PRESETS.find((p) => p.id === 'lastMonth')!.range('2026-03-25'), {
    from: '2026-02-20',
    to: '2026-03-20',
  });
});
