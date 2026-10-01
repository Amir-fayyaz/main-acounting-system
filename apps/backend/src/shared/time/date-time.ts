import { describeValue, validateNonBlank } from '../primitives/assert.js';
import { assertInstantParts, fromUtcMillis, toUtcMillis } from '../primitives/calendar.js';
import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { BusinessDate } from './business-date.js';

/**
 * A point in time: milliseconds since the Unix epoch, always expressed in UTC
 * (FND-006 serialization; architecture constraints section 12 — stored and
 * displayed time are separable, and a business date is not a technical
 * timestamp).
 *
 * This is the representation for the instant roles the domain distinguishes —
 * **Created At** and **Posted At** — while a civil day is a {@link BusinessDate}.
 * Keeping the two apart is what stops a record created at 23:30 UTC in Tehran
 * from acquiring the wrong business day: the instant is absolute, and the
 * domain converts it to a day only where it has decided which day it means.
 *
 * Parsing accepts any ISO-8601 offset and normalizes it, so a client in any
 * timezone round-trips correctly; emitting is always UTC with `Z`, which is the
 * only date-time format this system writes.
 */
const ISO_INSTANT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

const OFFSET_PATTERN = /^([+-])(\d{2}):(\d{2})$/;

/** Widest UTC offset ISO 8601 permits, in minutes (14 hours). */
const MAX_OFFSET_MINUTES = 14 * 60;

export class DateTime {
  /** Builds an instant from epoch milliseconds, rejecting anything out of range. */
  public static fromEpochMillis(epochMillis: number): DateTime {
    if (typeof epochMillis !== 'number' || !Number.isFinite(epochMillis)) {
      throw new InvalidPrimitiveError(
        'DateTime',
        `epochMillis must be a finite number but received ${describeValue(epochMillis)}`,
      );
    }
    assertInstantParts(fromUtcMillis(epochMillis), 'DateTime', 'timestamp');
    return new DateTime(epochMillis);
  }

  /** Wraps a `Date`, rejecting an invalid one instead of propagating `Invalid Date`. */
  public static from(date: Date): DateTime {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      throw new InvalidPrimitiveError(
        'DateTime',
        `expected a valid Date but received ${describeValue(date)}`,
      );
    }
    return DateTime.fromEpochMillis(date.getTime());
  }

  /** The current instant. Callers that need determinism build one explicitly. */
  public static now(): DateTime {
    return DateTime.fromEpochMillis(Date.now());
  }

  /**
   * Parses a full ISO-8601 date-time. A zone is mandatory — a naive
   * `2026-10-02T10:00:00` would silently mean "server local time", which is
   * exactly the ambiguity this type exists to prevent.
   */
  public static parse(value: string): DateTime {
    const text = validateNonBlank(value, 'DateTime', 'value');
    const match = ISO_INSTANT_PATTERN.exec(text);
    if (match === null) {
      throw new InvalidPrimitiveError(
        'DateTime',
        `value must be an ISO-8601 date-time with a zone, e.g. "2026-09-30T09:22:34.673Z", but received ${describeValue(value)}`,
      );
    }
    const parts = {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4]),
      minute: Number(match[5]),
      second: Number(match[6]),
      millisecond: match[7] === undefined ? 0 : Number(match[7].slice(1).padEnd(3, '0')),
    };
    assertInstantParts(parts, 'DateTime', 'value');
    const epochMillis = toUtcMillis(parts) - parseOffsetMinutes(match[8]) * 60_000;
    return DateTime.fromEpochMillis(epochMillis);
  }

  /** Milliseconds since the Unix epoch, in UTC. */
  public readonly epochMillis: number;

  private constructor(epochMillis: number) {
    this.epochMillis = epochMillis;
  }

  /** The ISO-8601 UTC text this system emits, e.g. `2026-09-30T09:22:34.673Z`. */
  public toIsoString(): string {
    return new Date(this.epochMillis).toISOString();
  }

  /** Interop with `Date`-taking APIs; the kernel itself never persists a `Date`. */
  public toDate(): Date {
    return new Date(this.epochMillis);
  }

  /** The UTC calendar day of this instant. */
  public toUtcDate(): BusinessDate {
    return BusinessDate.fromUtcMillis(this.epochMillis);
  }

  /**
   * The calendar day of this instant as observed in a fixed UTC offset. The
   * offset is given explicitly so no timezone is assumed on the caller's
   * behalf — an instant does not have a business day until a domain says which
   * offset defines it.
   */
  public toDateInOffset(offsetMinutes: number): BusinessDate {
    return BusinessDate.fromMillisInOffset(this.epochMillis, offsetMinutes);
  }

  /** Chronological order: `-1`, `0` or `1`. */
  public compareTo(other: DateTime): number {
    if (!(other instanceof DateTime)) {
      throw new InvalidPrimitiveError(
        'DateTime',
        `expected a DateTime but received ${describeValue(other)}`,
      );
    }
    if (this.epochMillis === other.epochMillis) {
      return 0;
    }
    return this.epochMillis < other.epochMillis ? -1 : 1;
  }

  public isBefore(other: DateTime): boolean {
    return this.compareTo(other) < 0;
  }

  public isAfter(other: DateTime): boolean {
    return this.compareTo(other) > 0;
  }

  /** Value equality: the same instant. */
  public equals(other: DateTime): boolean {
    return other instanceof DateTime && this.epochMillis === other.epochMillis;
  }

  public toString(): string {
    return this.toIsoString();
  }

  /** Serializes as an ISO-8601 UTC instant, the date-time wire format of FND-006. */
  public toJSON(): string {
    return this.toIsoString();
  }
}

/** Converts `Z`, `+HH:MM` or `-HH:MM` into signed minutes. */
function parseOffsetMinutes(zone: string): number {
  if (zone === 'Z') {
    return 0;
  }
  const match = OFFSET_PATTERN.exec(zone);
  if (match === null) {
    throw new InvalidPrimitiveError('DateTime', `zone ${describeValue(zone)} is not a UTC offset`);
  }
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  const offset = hours * 60 + minutes;
  if (minutes > 59 || hours > 14 || offset > MAX_OFFSET_MINUTES) {
    throw new InvalidPrimitiveError(
      'DateTime',
      `zone offset must be within ±14:00 but received ${describeValue(zone)}`,
    );
  }
  return match[1] === '-' ? -offset : offset;
}
