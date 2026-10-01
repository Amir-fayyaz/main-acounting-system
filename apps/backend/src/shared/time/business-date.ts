import { describeValue, validateIntegerInRange, validateNonBlank } from '../primitives/assert.js';
import {
  assertCivilDate,
  epochDays,
  fromUtcMillis,
  MILLIS_PER_DAY,
  toUtcMillis,
} from '../primitives/calendar.js';
import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';

/**
 * A calendar day with no time and no timezone — the shared representation for
 * the domain's *dates* (domain map section 3; Accounting domain section 7).
 *
 * The domain distinguishes four temporal roles: **Business Date**, **Accounting
 * Date**, **Created At** and **Posted At**. The kernel preserves that
 * distinction by refusing to model all four as one thing. The two date roles
 * are both civil days, so both are a `BusinessDate`; the two timestamp roles are
 * instants, so both are a `DateTime`. Which of the four a particular field
 * holds is a fact about the owning domain, expressed by naming the field
 * `businessDate`, `accountingDate`, `createdAt` or `postedAt` — the kernel
 * never merges them, and nothing here knows what a fiscal period is.
 *
 * Keeping dates timezone-free matters: attaching a timezone to a business day
 * would invent one, and a date written in Tehran and stored in UTC must not
 * shift by a day in either direction.
 */
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export class BusinessDate {
  /** Builds a date from calendar parts, rejecting impossible dates such as 30 February. */
  public static of(year: number, month: number, day: number): BusinessDate {
    assertCivilDate(year, month, day, 'BusinessDate', 'date');
    return new BusinessDate(year, month, day);
  }

  /** Parses the `YYYY-MM-DD` wire format of FND-006, strictly. */
  public static parse(value: string): BusinessDate {
    const text = validateNonBlank(value, 'BusinessDate', 'value');
    const match = ISO_DATE_PATTERN.exec(text);
    if (match === null) {
      throw new InvalidPrimitiveError(
        'BusinessDate',
        `value must be a calendar date in YYYY-MM-DD format but received ${describeValue(value)}`,
      );
    }
    return BusinessDate.of(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  /** The UTC calendar day of an instant, e.g. for Created At recorded in UTC. */
  public static fromUtcMillis(millis: number): BusinessDate {
    const parts = fromUtcMillis(millis);
    return BusinessDate.of(parts.year, parts.month, parts.day);
  }

  /**
   * The calendar day of an instant as observed in a fixed UTC offset, for the
   * domains whose business day is defined by a local offset rather than UTC.
   * The offset is stated per call so no timezone is assumed on the caller's
   * behalf.
   */
  public static fromMillisInOffset(millis: number, offsetMinutes: number): BusinessDate {
    const offset = validateIntegerInRange(
      offsetMinutes,
      -14 * 60,
      14 * 60,
      'BusinessDate',
      'offsetMinutes',
    );
    return BusinessDate.fromUtcMillis(millis + offset * 60_000);
  }

  public readonly year: number;
  public readonly month: number;
  public readonly day: number;

  private constructor(year: number, month: number, day: number) {
    this.year = year;
    this.month = month;
    this.day = day;
  }

  /** The canonical `YYYY-MM-DD` text. */
  public toIsoString(): string {
    return `${String(this.year).padStart(4, '0')}-${String(this.month).padStart(2, '0')}-${String(this.day).padStart(2, '0')}`;
  }

  /** Start of this day in UTC — for range queries, not a claim about the business timezone. */
  public toUtcStartOfDayMillis(): number {
    return toUtcMillis({
      year: this.year,
      month: this.month,
      day: this.day,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
  }

  /** Moves by a whole number of days, validating the result is still a real date. */
  public addDays(days: number): BusinessDate {
    const offset = validateIntegerInRange(days, -3_650_000, 3_650_000, 'BusinessDate', 'days');
    return BusinessDate.fromUtcMillis(this.toUtcStartOfDayMillis() + offset * MILLIS_PER_DAY);
  }

  public subtractDays(days: number): BusinessDate {
    return this.addDays(-days);
  }

  /** Whole days from `other` to this date: positive when this date is later. */
  public diffDays(other: BusinessDate): number {
    if (!(other instanceof BusinessDate)) {
      throw new InvalidPrimitiveError(
        'BusinessDate',
        `expected a BusinessDate but received ${describeValue(other)}`,
      );
    }
    return epochDays(this) - epochDays(other);
  }

  /** Calendar order: `-1`, `0` or `1`. */
  public compareTo(other: BusinessDate): number {
    if (!(other instanceof BusinessDate)) {
      throw new InvalidPrimitiveError(
        'BusinessDate',
        `expected a BusinessDate but received ${describeValue(other)}`,
      );
    }
    if (this.year !== other.year) {
      return this.year < other.year ? -1 : 1;
    }
    if (this.month !== other.month) {
      return this.month < other.month ? -1 : 1;
    }
    if (this.day !== other.day) {
      return this.day < other.day ? -1 : 1;
    }
    return 0;
  }

  public isBefore(other: BusinessDate): boolean {
    return this.compareTo(other) < 0;
  }

  public isAfter(other: BusinessDate): boolean {
    return this.compareTo(other) > 0;
  }

  /** Value equality: same year, month and day. */
  public equals(other: BusinessDate): boolean {
    return (
      other instanceof BusinessDate &&
      this.year === other.year &&
      this.month === other.month &&
      this.day === other.day
    );
  }

  public toString(): string {
    return this.toIsoString();
  }

  /** Serializes as `YYYY-MM-DD`, the calendar-date wire format of FND-006. */
  public toJSON(): string {
    return this.toIsoString();
  }
}
