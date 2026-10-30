import { BusinessDate } from '../../../../shared/time/business-date.js';
import type { DateTime } from '../../../../shared/time/date-time.js';
import {
  FiscalYearOverlapPolicy,
  type FiscalYearSpan,
} from '../policies/fiscal-year-overlap.policy.js';
import { FiscalYearAlreadyClosedError } from '../errors/fiscal-year.errors.js';
import {
  generateFiscalYearId,
  fiscalYearIdFrom,
  type FiscalYearId,
} from '../value-objects/fiscal-year-id.js';
import { FiscalYearLabel } from '../value-objects/fiscal-year-label.js';
import { FiscalYearRange } from '../value-objects/fiscal-year-range.js';
import {
  FiscalYearStatus,
  type FiscalYearStatusValue,
} from '../value-objects/fiscal-year-status.js';
import {
  tenantReferenceFrom,
  type TenantReference,
} from '../value-objects/tenant-reference.js';

/**
 * The FiscalYear aggregate root (FIS-002; design section 4).
 *
 * A fiscal year is the annual frame every accounting operation hangs from:
 * periods are generated inside it, and postings must fall inside an open
 * period of it. This ticket delivers the year itself — the model, the range,
 * the status and the non-overlap invariant — and deliberately nothing about
 * periods or calendars.
 *
 * The one idea that must survive review: **a fiscal year is a tenant-owned,
 * non-overlapping date range**. Three properties carry it:
 *
 * - **Tenant-owned.** The tenant is part of the rule, not just a foreign key:
 *   two companies may frame the same days however they like, one company may
 *   never cover a day twice. The tenant identity arrives as an explicit input;
 *   the domain never reads the ambient scope (SHR-007).
 * - **Constructed valid.** `create` consults the overlap policy against the
 *   years that already exist, so a year *cannot be constructed* in a state
 *   that overlaps one of its own tenant's years. The policy is the single
 *   source of the rule; the aggregate is one of its callers, not a second
 *   implementation.
 * - **A guarded, minimal lifecycle.** A year is created `open` and may be
 *   closed; there is deliberately no reopen, because reopening is a controlled
 *   act of the period-closing policy, not part of this ticket.
 *
 * The class is framework-free by contract: it may import the shared kernel and
 * its own module only, and never a transport, an ORM or the ambient tenant
 * scope. The application supplies a `DateTime` for every mutation so the
 * domain never reads the clock itself and a test can fix time.
 */

/** The plain state of a fiscal year, as storage and mapping see it. */
export interface FiscalYearSnapshot {
  readonly id: string;
  readonly tenantId: string;
  readonly label: string;
  /** Inclusive first day, `YYYY-MM-DD`. */
  readonly startDate: string;
  /** Inclusive last day, `YYYY-MM-DD`. */
  readonly endDate: string;
  readonly status: FiscalYearStatusValue;
  readonly createdAt: DateTime;
  readonly updatedAt: DateTime;
}

export class FiscalYear {
  private constructor(
    private readonly _id: FiscalYearId,
    private readonly _tenantId: TenantReference,
    private readonly _label: FiscalYearLabel,
    private readonly _range: FiscalYearRange,
    private _status: FiscalYearStatus,
    private readonly _createdAt: DateTime,
    private _updatedAt: DateTime,
  ) {}

  /**
   * Creates a new fiscal year in the `open` state.
   *
   * @param input.range — an already-valid range; `FiscalYearRange.of` refuses
   * a reversed or zero-length one before this is called.
   * @param existing — the years that already exist **for this tenant**, given
   * to the overlap policy so an overlapping year cannot be constructed. Years
   * of other tenants may be passed freely; the policy compares the tenant too.
   * @param input.id — an explicit identity, for rehydration-style tests; a
   * fresh, globally unique id is generated when it is omitted.
   *
   * @throws FiscalYearOverlapError — the range shares a day with one of
   * `existing` years of the same tenant.
   */
  public static create(
    input: {
      readonly tenantId: TenantReference;
      readonly label: FiscalYearLabel;
      readonly range: FiscalYearRange;
      readonly now: DateTime;
      readonly id?: FiscalYearId;
    },
    existing: readonly FiscalYearSpan[] = [],
  ): FiscalYear {
    const declined = FiscalYearOverlapPolicy.evaluate(
      { tenantId: input.tenantId, range: input.range },
      existing,
    );
    if (declined.isFail()) {
      throw declined.errorOrThrow();
    }

    return new FiscalYear(
      input.id ?? generateFiscalYearId(),
      input.tenantId,
      input.label,
      input.range,
      FiscalYearStatus.OPEN,
      input.now,
      input.now,
    );
  }

  /**
   * Rebuilds a fiscal year from stored state.
   *
   * Values are re-validated through their value objects, so a broken record
   * fails loudly at the boundary instead of entering the domain as an
   * impossible state — including a range whose start is not before its end.
   */
  public static rehydrate(snapshot: FiscalYearSnapshot): FiscalYear {
    const startDate = parseStoredDate(snapshot.startDate);
    const endDate = parseStoredDate(snapshot.endDate);

    return new FiscalYear(
      fiscalYearIdFrom(snapshot.id),
      tenantReferenceFrom(snapshot.tenantId),
      FiscalYearLabel.from(snapshot.label),
      FiscalYearRange.of(startDate, endDate),
      FiscalYearStatus.from(snapshot.status),
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  /** The stable, never-reused year identity. */
  public get id(): FiscalYearId {
    return this._id;
  }

  /** The stable identity of the tenant that owns this year. */
  public get tenantId(): TenantReference {
    return this._tenantId;
  }

  /** The human label, unique per tenant. */
  public get label(): FiscalYearLabel {
    return this._label;
  }

  /** The inclusive date range this year covers. */
  public get range(): FiscalYearRange {
    return this._range;
  }

  /** The current lifecycle state. */
  public get status(): FiscalYearStatus {
    return this._status;
  }

  /** When the year was created. */
  public get createdAt(): DateTime {
    return this._createdAt;
  }

  /** When any mutable attribute last changed. */
  public get updatedAt(): DateTime {
    return this._updatedAt;
  }

  /**
   * Takes the year out of use. The record and its history are retained, and
   * the range keeps blocking an overlapping year.
   *
   * @throws FiscalYearAlreadyClosedError — the year is already closed. There
   * is deliberately no reopen: it belongs to the period-closing policy.
   */
  public close(now: DateTime): void {
    if (this._status.isClosed()) {
      throw new FiscalYearAlreadyClosedError();
    }
    this._status = FiscalYearStatus.CLOSED;
    this._updatedAt = now;
  }

  /** Whether the year may still be changed by lifecycle operations. */
  public isOpen(): boolean {
    return this._status.isOpen();
  }

  /**
   * The year's span — the two facts the overlap rule needs — as the policy
   * sees them. The aggregate satisfies `FiscalYearSpan` structurally; this
   * builder exists for call sites that want the narrower type explicitly.
   */
  public span(): FiscalYearSpan {
    return { tenantId: this._tenantId, range: this._range };
  }

  /**
   * The aggregate's current state as plain values.
   *
   * Used by adapters that translate to a row and by test doubles that must not
   * hand out the live instance; it is a copy, so mutating the result cannot
   * reach back into this aggregate.
   */
  public snapshot(): FiscalYearSnapshot {
    return {
      id: this._id.value,
      tenantId: this._tenantId.value,
      label: this._label.value,
      startDate: this._range.startDate.toIsoString(),
      endDate: this._range.endDate.toIsoString(),
      status: this._status.value,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

/** Parses a stored `YYYY-MM-DD` day back into the kernel's civil date. */
function parseStoredDate(value: string): BusinessDate {
  // `BusinessDate.parse` rejects anything that is not a real calendar day, so
  // a corrupted column fails here rather than becoming a silently wrong year.
  return BusinessDate.parse(value);
}
