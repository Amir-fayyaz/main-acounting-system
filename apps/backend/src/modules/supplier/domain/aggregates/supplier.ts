import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { validateNonBlank } from '../../../../shared/primitives/assert.js';
import type { DateTime } from '../../../../shared/time/date-time.js';
import {
  SupplierAlreadyActiveError,
  SupplierAlreadyInactiveError,
} from '../errors/supplier.errors.js';
import {
  SupplierDuplicatePolicy,
  type SupplierDuplicateRecord,
} from '../policies/supplier-duplicate.policy.js';
import {
  generateSupplierId,
  supplierIdFrom,
  type SupplierId,
} from '../value-objects/supplier-id.js';
import { SupplierCode } from '../value-objects/supplier-code.js';
import { SupplierName } from '../value-objects/supplier-name.js';
import { SupplierIdentificationNumber } from '../value-objects/supplier-identification-number.js';
import {
  SupplierContactInfo,
  type SupplierContactInfoProps,
} from '../value-objects/supplier-contact-info.js';
import { SupplierStatus, type SupplierStatusValue } from '../value-objects/supplier-status.js';

/** The plain state of a supplier, as storage and mapping see it. */
export interface SupplierSnapshot {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly normalizedName: string;
  readonly identificationNumber?: string;
  readonly contactInfo?: SupplierContactInfoProps;
  readonly status: SupplierStatusValue;
  readonly createdAt: DateTime;
  readonly updatedAt: DateTime;
}

/** Everything creation needs, including the existing tenant suppliers to check against. */
export interface CreateSupplierInput {
  readonly id?: SupplierId;
  readonly tenantId: string;
  readonly code: SupplierCode;
  readonly name: SupplierName;
  readonly identificationNumber?: SupplierIdentificationNumber;
  readonly contactInfo?: SupplierContactInfo;
  readonly now: DateTime;
  /**
   * The tenant's existing suppliers. Required, not optional: a supplier cannot
   * be constructed through a path that never evaluated the duplicate rule.
   */
  readonly existingSuppliers: readonly SupplierDuplicateRecord[];
  /** The single source of the duplicate rule, with its name normalizer injected. */
  readonly duplicatePolicy: SupplierDuplicatePolicy;
  /**
   * Set only after the caller has shown the possible duplicates to the user and
   * the user confirmed that this is a different real supplier. It never skips
   * the rule; hard conflicts are still refused.
   */
  readonly confirmPossibleDuplicate?: boolean;
}

/**
 * The result of creating a supplier.
 *
 * A normalized-name match is not an error and does not create anything: it is a
 * "possible duplicate" outcome that carries the matching suppliers so the
 * caller can ask for confirmation. Code and identification matches are hard
 * conflicts and are returned as a failed `Result` instead.
 */
export type SupplierCreationOutcome =
  | { readonly kind: 'created'; readonly supplier: Supplier }
  | {
      readonly kind: 'possibleDuplicate';
      readonly matches: readonly SupplierDuplicateRecord[];
    };

/**
 * The Supplier aggregate root (PUR-001; ADR-002 section 10).
 *
 * Invariants:
 *
 * - A supplier belongs to exactly one tenant, supplied explicitly by the caller.
 * - Its code and optional identification number are unique within that tenant.
 * - A normalized-name match is reported as a possible duplicate, never silently
 *   created.
 * - It is created active and can move active -> inactive -> active. There is no
 *   delete: historical records keep pointing at an inactive supplier.
 * - Every timestamp is injected; the domain never reads the clock.
 */
export class Supplier {
  private constructor(
    public readonly id: SupplierId,
    public readonly tenantId: string,
    private readonly _code: SupplierCode,
    private readonly _name: SupplierName,
    private readonly _normalizedName: string,
    private readonly _identificationNumber: SupplierIdentificationNumber | undefined,
    private readonly _contactInfo: SupplierContactInfo | undefined,
    private _status: SupplierStatus,
    public readonly createdAt: DateTime,
    private _updatedAt: DateTime,
  ) {}

  /**
   * Creates a supplier after evaluating the duplicate rule.
   *
   * @returns a created outcome, a possible-duplicate outcome (nothing is
   * created), or a failed result for a hard code/identification conflict.
   */
  public static create(input: CreateSupplierInput): Result<SupplierCreationOutcome, DomainError> {
    const tenantId = validateNonBlank(input.tenantId, 'Supplier', 'tenantId');

    const assessment = input.duplicatePolicy.evaluate(
      {
        tenantId,
        code: input.code,
        name: input.name,
        identificationNumber: input.identificationNumber,
      },
      input.existingSuppliers,
    );

    if (assessment.decision.kind === 'conflict') {
      return Result.fail(assessment.decision.error);
    }

    if (
      assessment.decision.kind === 'possibleDuplicate' &&
      input.confirmPossibleDuplicate !== true
    ) {
      const possible: SupplierCreationOutcome = {
        kind: 'possibleDuplicate',
        matches: assessment.decision.matches,
      };
      return Result.ok(possible);
    }

    const supplier = new Supplier(
      input.id ?? generateSupplierId(),
      tenantId,
      input.code,
      input.name,
      assessment.normalizedName,
      input.identificationNumber,
      input.contactInfo,
      SupplierStatus.ACTIVE,
      input.now,
      input.now,
    );

    const created: SupplierCreationOutcome = { kind: 'created', supplier };
    return Result.ok(created);
  }

  /** Rebuilds a supplier from stored state; used by persistence, not creation. */
  public static rehydrate(snapshot: SupplierSnapshot): Supplier {
    return new Supplier(
      supplierIdFrom(snapshot.id),
      validateNonBlank(snapshot.tenantId, 'Supplier', 'tenantId'),
      SupplierCode.from(snapshot.code),
      SupplierName.from(snapshot.name),
      validateNonBlank(snapshot.normalizedName, 'Supplier', 'normalizedName'),
      snapshot.identificationNumber === undefined
        ? undefined
        : SupplierIdentificationNumber.from(snapshot.identificationNumber),
      snapshot.contactInfo === undefined
        ? undefined
        : SupplierContactInfo.create(snapshot.contactInfo),
      SupplierStatus.from(snapshot.status),
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  public get code(): SupplierCode {
    return this._code;
  }

  public get name(): SupplierName {
    return this._name;
  }

  public get normalizedName(): string {
    return this._normalizedName;
  }

  public get identificationNumber(): SupplierIdentificationNumber | undefined {
    return this._identificationNumber;
  }

  public get contactInfo(): SupplierContactInfo | undefined {
    return this._contactInfo;
  }

  public get status(): SupplierStatus {
    return this._status;
  }

  public get updatedAt(): DateTime {
    return this._updatedAt;
  }

  public isActive(): boolean {
    return this._status.isActive();
  }

  /**
   * Moves an active supplier to inactive.
   *
   * Deactivating an already-inactive supplier is refused with a stable
   * `SUPPLIER_ALREADY_INACTIVE` error, and the failed transition changes
   * neither the status nor `updatedAt`.
   */
  public deactivate(now: DateTime): Result<void, DomainError> {
    if (this._status.isInactive()) {
      return Result.fail(new SupplierAlreadyInactiveError(this.id.value));
    }
    this._status = SupplierStatus.INACTIVE;
    this._updatedAt = now;
    return Result.ok(undefined);
  }

  /**
   * Moves an inactive supplier back to active.
   *
   * Activating an already-active supplier is refused with a stable
   * `SUPPLIER_ALREADY_ACTIVE` error, and the failed transition changes neither
   * the status nor `updatedAt`.
   */
  public activate(now: DateTime): Result<void, DomainError> {
    if (this._status.isActive()) {
      return Result.fail(new SupplierAlreadyActiveError(this.id.value));
    }
    this._status = SupplierStatus.ACTIVE;
    this._updatedAt = now;
    return Result.ok(undefined);
  }

  public snapshot(): SupplierSnapshot {
    return {
      id: this.id.value,
      tenantId: this.tenantId,
      code: this._code.value,
      name: this._name.value,
      normalizedName: this._normalizedName,
      identificationNumber: this._identificationNumber?.value,
      contactInfo: this._contactInfo?.toJSON(),
      status: this._status.value,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
