import { describeValue, validateIntegerInRange } from '../../../../shared/primitives/assert.js';
import type { DateTime } from '../../../../shared/time/date-time.js';
import { FiscalPeriodState } from '../value-objects/fiscal-period-state.js';
import type { FiscalPeriodStateValue } from '../value-objects/fiscal-period-state.js';
import {
  generateFiscalPeriodId,
  fiscalPeriodIdFrom,
  type FiscalPeriodId,
} from '../value-objects/fiscal-period-id.js';
import { tenantReferenceFrom, type TenantReference } from '../value-objects/tenant-reference.js';
import { FiscalYearRange } from '../value-objects/fiscal-year-range.js';
import { fiscalYearIdFrom, type FiscalYearId } from '../value-objects/fiscal-year-id.js';
import { BusinessDate } from '../../../../shared/time/business-date.js';
import {
  PeriodStateInvalidError,
  ReopenReasonRequiredError,
} from '../errors/fiscal-period.errors.js';

export interface FiscalPeriodSnapshot {
  readonly id: string;
  readonly tenantId: string;
  readonly fiscalYearId: string;
  readonly jalaliYear: number;
  readonly sequence: number;
  readonly startDate: string;
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
    private _state: FiscalPeriodState,
    private readonly _createdAt: DateTime,
    private _updatedAt: DateTime,
  ) {}

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

  public get id(): FiscalPeriodId {
    return this._id;
  }

  public get tenantId(): TenantReference {
    return this._tenantId;
  }

  public get fiscalYearId(): FiscalYearId {
    return this._fiscalYearId;
  }

  public get jalaliYear(): number {
    return this._jalaliYear;
  }

  public get sequence(): number {
    return this._sequence;
  }

  public get range(): FiscalYearRange {
    return this._range;
  }

  public get state(): FiscalPeriodState {
    return this._state;
  }

  public get createdAt(): DateTime {
    return this._createdAt;
  }

  public get updatedAt(): DateTime {
    return this._updatedAt;
  }

  public isOpen(): boolean {
    return this._state.isOpen();
  }

  /**
   * Closes an open fiscal period so it stops accepting postings (FIS-005).
   *
   * @throws PeriodStateInvalidError when the period is already closed.
   */
  public close(now: DateTime): void {
    if (this._state.isClosed()) {
      throw new PeriodStateInvalidError('The fiscal period is already closed.');
    }
    this._state = FiscalPeriodState.CLOSED;
    this._updatedAt = now;
  }

  /**
   * Reopens a closed fiscal period with a mandatory justification (FIS-005).
   *
   * @throws ReopenReasonRequiredError when the reason is empty or whitespace.
   * @throws PeriodStateInvalidError when the period is already open.
   */
  public reopen(reason: string, now: DateTime): void {
    const trimmed = typeof reason === 'string' ? reason.trim() : '';
    if (trimmed.length === 0) {
      throw new ReopenReasonRequiredError();
    }
    if (this._state.isOpen()) {
      throw new PeriodStateInvalidError('The fiscal period is already open.');
    }
    this._state = FiscalPeriodState.OPEN;
    this._updatedAt = now;
  }

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

function parseStoredDate(value: string): BusinessDate {
  if (typeof value !== 'string') {
    throw new TypeError(`startDate/endDate must be a string but received ${describeValue(value)}`);
  }
  return BusinessDate.parse(value);
}
