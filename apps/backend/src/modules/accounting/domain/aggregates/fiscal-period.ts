import { describeValue, validateIntegerInRange } from '../../../../shared/primitives/assert.js';
import type { DateTime } from '../../../../shared/time/date-time.js';
import { FiscalPeriodState } from '../value-objects/fiscal-period-state.js';
import type { FiscalPeriodStateValue } from '../value-objects/fiscal-period-state.js';
import {
  generateFiscalPeriodId,
  fiscalPeriodIdFrom,
  type FiscalPeriodId,
} from '../value-objects/fiscal-period-id.js';
import {
  tenantReferenceFrom,
  type TenantReference,
} from '../value-objects/tenant-reference.js';
import { FiscalYearRange } from '../value-objects/fiscal-year-range.js';
import {
  fiscalYearIdFrom,
  type FiscalYearId,
} from '../value-objects/fiscal-year-id.js';
import { BusinessDate } from '../../../../shared/time/business-date.js';

/**
 * The FiscalPeriod aggregate root (FIS-004).
 *
 * A fiscal period is the slice of one fiscal year the company books into: a
 * tenant-owned, month-sequenced, contiguous inclusive day range that is either
 * `open` or `closed`. This ticket delivers the entity and its lifetime as the
 * generation and active-period rules create it — the closing act itself
 * belongs to FIS-005.
 *
 * The one idea that must survive review: **a period is a tenant-owned slice of
 * exactly one fiscal year, contiguous with its neighbours**. The properties:
 *
 * - **Tenant-owned.** The tenant arrives as an explicit input; the domain
 *   never reads the ambient scope (SHR-007).
 * - **A slice of one year.** The year identity and the Jalali year number are
 *   part of the state, and the `sequence` (1–12, highest month first in
 *   calendar order) anchors the period inside the year. Contiguity itself is
 *   decided by {@link FiscalPeriodGenerationPolicy} before construction, so a
 *   plan can never be built out of shape.
 * - **A guarded, minimal lifecycle.** A period is created `open`; closing is
 *   FIS-005, so the only state operations this class exposes are reads.
 *
 * The class is framework-free by contract: it may import the shared kernel and
 * its own module only. The application supplies a `DateTime` for creation so
 * the domain never reads the clock itself and a test can fix time.
 */

/** The plain state of a fiscal period, as storage and mapping see it. */
export interface FiscalPeriodSnapshot {
  readonly id: string;
  readonly tenantId: string;
  readonly fiscalYearId: string;
  /** The Jalali calendar year the period belongs to, 1 Farvardin to last Esfand. */
  readonly jalaliYear: number;
  /** The month position inside the year: 1 (Farvardin) through 12 (Esfand). */
  readonly sequence: number;
  /** Inclusive first day, `YYYY-MM-DD`. */
  readonly startDate: string;
  /** Inclusive last day, `YYYY-MM-DD`. */
  readonly endDate: string;
  readonly state: FiscalPeriodStateValue;
  readonly createdAt: DateTime;
  readonly updatedAt: DateTime;
}

export class FiscalPeriod {
  private constructor(
    private readonly _id: FiscalPeriodId,
    private readonly _tenantId: TenantReference,
    private readonly _fiscalYearId: FiscalYearId,
    private readonly _jalaliYear: number,
    private readonly _sequence: number,
    private readonly _range: FiscalYearRange,
    private readonly _state: FiscalPeriodState,
    private readonly _createdAt: DateTime,
    private readonly _updatedAt: DateTime,
  ) {}

  /**
   * Creates a new fiscal period in the `open` state.
   *
   * @param input.range — an already-valid inclusive range; the generation
   * policy validated the sequence and contiguity before this is called.
   * @param input.jalaliYear — the Jalali year the month belongs to.
   * @param input.sequence — the month position, 1 through 12.
   * @param input.id — an explicit identity, for rehydration-style tests; a
   * fresh, globally unique id is generated when it is omitted.
   *
   * @throws InvalidPrimitiveError — the sequence is not an integer 1..12, the
   * Jalali year is not a positive four-digit-like number, or the range is
   * reversed or zero-length. All are construction bugs the policy should have
   * prevented, so they throw rather than become business outcomes.
   */
  public static create(input: {
    readonly tenantId: TenantReference;
    readonly fiscalYearId: FiscalYearId;
    readonly jalaliYear: number;
    readonly sequence: number;
    readonly range: FiscalYearRange;
    readonly now: DateTime;
    readonly id?: FiscalPeriodId;
  }): FiscalPeriod {
    validateIntegerInRange(input.sequence, 1, 12, 'FiscalPeriod', 'sequence');
    validateIntegerInRange(input.jalaliYear, 1, 9999, 'FiscalPeriod', 'jalaliYear');

    return new FiscalPeriod(
      input.id ?? generateFiscalPeriodId(),
      input.tenantId,
      input.fiscalYearId,
      input.jalaliYear,
      input.sequence,
      input.range,
      FiscalPeriodState.OPEN,
      input.now,
      input.now,
    );
  }

  /**
   * Rebuilds a fiscal period from stored state.
   *
   * Values are re-validated through their value objects, so a broken record
   * fails loudly at the boundary instead of entering the domain as an
   * impossible state — including a range whose start is not before its end.
   */
  public static rehydrate(snapshot: FiscalPeriodSnapshot): FiscalPeriod {
    const range = FiscalYearRange.of(
      parseStoredDate(snapshot.startDate),
      parseStoredDate(snapshot.endDate),
    );

    return new FiscalPeriod(
      fiscalPeriodIdFrom(snapshot.id),
      tenantReferenceFrom(snapshot.tenantId),
      fiscalYearIdFrom(snapshot.fiscalYearId),
      validateIntegerInRange(snapshot.jalaliYear, 1, 9999, 'FiscalPeriod', 'jalaliYear'),
      validateIntegerInRange(snapshot.sequence, 1, 12, 'FiscalPeriod', 'sequence'),
      range,
      FiscalPeriodState.from(snapshot.state),
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  /** The stable, never-reused period identity. */
  public get id(): FiscalPeriodId {
    return this._id;
  }

  /** The stable identity of the tenant that owns this period. */
  public get tenantId(): TenantReference {
    return this._tenantId;
  }

  /** The fiscal year this period is a slice of. */
  public get fiscalYearId(): FiscalYearId {
    return this._fiscalYearId;
  }

  /** The Jalali calendar year the period belongs to. */
  public get jalaliYear(): number {
    return this._jalaliYear;
  }

  /** The month position inside the year, 1 (Farvardin) through 12 (Esfand). */
  public get sequence(): number {
    return this._sequence;
  }

  /** The inclusive date range this period covers. */
  public get range(): FiscalYearRange {
    return this._range;
  }

  /** The current lifecycle state. */
  public get state(): FiscalPeriodState {
    return this._state;
  }

  /** When the period was created. */
  public get createdAt(): DateTime {
    return this._createdAt;
  }

  /** When any mutable attribute last changed. */
  public get updatedAt(): DateTime {
    return this._updatedAt;
  }

  /** Whether the period may still be booked into. */
  public isOpen(): boolean {
    return this._state.isOpen();
  }

  /**
   * The aggregate's current state as plain values.
   *
   * Used by adapters that translate to a row and by test doubles that must not
   * hand out the live instance; it is a copy, so mutating the result cannot
   * reach back into this aggregate.
   */
  public snapshot(): FiscalPeriodSnapshot {
    return {
      id: this._id.value,
      tenantId: this._tenantId.value,
      fiscalYearId: this._fiscalYearId.value,
      jalaliYear: this._jalaliYear,
      sequence: this._sequence,
      startDate: this._range.startDate.toIsoString(),
      endDate: this._range.endDate.toIsoString(),
      state: this._state.value,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

/** Parses a stored `YYYY-MM-DD` day back into the kernel's civil date. */
function parseStoredDate(value: string): BusinessDate {
  // `BusinessDate.parse` rejects anything that is not a real calendar day, so
  // a corrupted column fails here rather than becoming a silently wrong period.
  if (typeof value !== 'string') {
    throw new TypeError(`startDate/endDate must be a string but received ${describeValue(value)}`);
  }
  return BusinessDate.parse(value);
}
