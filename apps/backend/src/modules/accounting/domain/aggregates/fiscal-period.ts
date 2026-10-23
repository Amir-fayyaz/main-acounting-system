import { EntityId } from '../../../../shared/id/entity-id.js';
import { BusinessDate } from '../../../../shared/time/business-date.js';
import type { DateTime } from '../../../../shared/time/date-time.js';
import {
  ClosedPeriodCannotBeActiveError,
  PeriodStateInvalidError,
  ReopenReasonRequiredError,
} from '../errors/fiscal-period.errors.js';
import type { FiscalYearId } from '../value-objects/fiscal-year-id.js';
import type { TenantReference } from '../value-objects/tenant-reference.js';

export type FiscalPeriodStatus = 'open' | 'closed';

export interface FiscalPeriodSnapshot {
  readonly id: string;
  readonly tenantId: string;
  readonly fiscalYearId: string;
  readonly sequenceNumber: number;
  readonly label: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: FiscalPeriodStatus;
  readonly isActive: boolean;
  readonly reopenReason?: string;
  readonly createdAt: DateTime;
  readonly updatedAt: DateTime;
}

export class FiscalPeriod {
  private constructor(
    private readonly _id: EntityId,
    private readonly _tenantId: TenantReference,
    private readonly _fiscalYearId: FiscalYearId,
    private readonly _sequenceNumber: number,
    private readonly _label: string,
    private readonly _startDate: BusinessDate,
    private readonly _endDate: BusinessDate,
    private _status: FiscalPeriodStatus,
    private _isActive: boolean,
    private _reopenReason: string | undefined,
    private readonly _createdAt: DateTime,
    private _updatedAt: DateTime,
  ) {}

  public static create(input: {
    readonly id?: EntityId;
    readonly tenantId: TenantReference;
    readonly fiscalYearId: FiscalYearId;
    readonly sequenceNumber: number;
    readonly label: string;
    readonly startDate: BusinessDate;
    readonly endDate: BusinessDate;
    readonly isActive?: boolean;
    readonly now: DateTime;
  }): FiscalPeriod {
    return new FiscalPeriod(
      input.id ?? EntityId.generate(),
      input.tenantId,
      input.fiscalYearId,
      input.sequenceNumber,
      input.label,
      input.startDate,
      input.endDate,
      'open',
      input.isActive ?? false,
      undefined,
      input.now,
      input.now,
    );
  }

  public static rehydrate(snapshot: FiscalPeriodSnapshot): FiscalPeriod {
    return new FiscalPeriod(
      EntityId.from(snapshot.id),
      EntityId.from(snapshot.tenantId),
      EntityId.from(snapshot.fiscalYearId),
      snapshot.sequenceNumber,
      snapshot.label,
      BusinessDate.parse(snapshot.startDate),
      BusinessDate.parse(snapshot.endDate),
      snapshot.status,
      snapshot.isActive,
      snapshot.reopenReason,
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  public get id(): EntityId {
    return this._id;
  }
  public get tenantId(): TenantReference {
    return this._tenantId;
  }
  public get fiscalYearId(): FiscalYearId {
    return this._fiscalYearId;
  }
  public get sequenceNumber(): number {
    return this._sequenceNumber;
  }
  public get label(): string {
    return this._label;
  }
  public get startDate(): BusinessDate {
    return this._startDate;
  }
  public get endDate(): BusinessDate {
    return this._endDate;
  }
  public get status(): FiscalPeriodStatus {
    return this._status;
  }
  public get isActive(): boolean {
    return this._isActive;
  }
  public get reopenReason(): string | undefined {
    return this._reopenReason;
  }
  public get createdAt(): DateTime {
    return this._createdAt;
  }
  public get updatedAt(): DateTime {
    return this._updatedAt;
  }

  public close(now: DateTime): void {
    if (this._status === 'closed') {
      throw new PeriodStateInvalidError('The period is already closed.');
    }
    this._status = 'closed';
    this._updatedAt = now;
  }

  public reopen(reason: string, now: DateTime): void {
    if (this._status === 'open') {
      throw new PeriodStateInvalidError('The period is already open.');
    }
    const trimmed = reason.trim();
    if (trimmed.length === 0) {
      throw new ReopenReasonRequiredError();
    }
    this._status = 'open';
    this._reopenReason = trimmed;
    this._updatedAt = now;
  }

  public activate(now: DateTime): void {
    if (this._status === 'closed') {
      throw new ClosedPeriodCannotBeActiveError();
    }
    this._isActive = true;
    this._updatedAt = now;
  }

  public deactivate(now: DateTime): void {
    this._isActive = false;
    this._updatedAt = now;
  }

  public snapshot(): FiscalPeriodSnapshot {
    return {
      id: this._id.value,
      tenantId: this._tenantId.value,
      fiscalYearId: this._fiscalYearId.value,
      sequenceNumber: this._sequenceNumber,
      label: this._label,
      startDate: this._startDate.toIsoString(),
      endDate: this._endDate.toIsoString(),
      status: this._status,
      isActive: this._isActive,
      reopenReason: this._reopenReason,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
