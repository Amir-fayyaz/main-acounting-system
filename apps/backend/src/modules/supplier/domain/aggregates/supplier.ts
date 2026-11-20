import { Result } from '../../../../shared/errors/result.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import {
  SupplierAlreadyActiveError,
  SupplierAlreadyInactiveError,
} from '../errors/supplier.errors.js';
import { SupplierId, generateSupplierId, supplierIdFrom } from '../value-objects/supplier-id.js';
import { SupplierCode } from '../value-objects/supplier-code.js';
import { SupplierName } from '../value-objects/supplier-name.js';
import { NormalizedSupplierName } from '../value-objects/normalized-supplier-name.js';
import { LegalIdentificationNumber } from '../value-objects/legal-identification-number.js';
import { SupplierContactInfo } from '../value-objects/supplier-contact-info.js';
import { SupplierStatus } from '../value-objects/supplier-status.js';

export interface SupplierSnapshot {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly normalizedName: string;
  readonly identificationNumber?: string | null;
  readonly contactInfo?: {
    readonly phone?: string | null;
    readonly email?: string | null;
    readonly address?: string | null;
    readonly postalCode?: string | null;
  } | null;
  readonly status: 'active' | 'inactive';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateSupplierProps {
  readonly id?: SupplierId;
  readonly tenantId: string;
  readonly code: SupplierCode;
  readonly name: SupplierName;
  readonly identificationNumber?: LegalIdentificationNumber;
  readonly contactInfo?: SupplierContactInfo;
  readonly now: DateTime;
}

export interface UpdateSupplierProps {
  readonly code?: SupplierCode;
  readonly name?: SupplierName;
  readonly identificationNumber?: LegalIdentificationNumber | null;
  readonly contactInfo?: SupplierContactInfo | null;
  readonly now: DateTime;
}

/**
 * Supplier aggregate root (PUR-001; ADR-002 section 10).
 * Invariants:
 * - A supplier belongs to exactly one tenant.
 * - Code is unique within the tenant.
 * - Created in 'active' status by default.
 * - Cannot be physically deleted once created (PUR-BR-006).
 */
export class Supplier {
  private _code: SupplierCode;
  private _name: SupplierName;
  private _normalizedName: NormalizedSupplierName;
  private _identificationNumber?: LegalIdentificationNumber;
  private _contactInfo?: SupplierContactInfo;
  private _status: SupplierStatus;
  private _updatedAt: DateTime;

  private constructor(
    public readonly id: SupplierId,
    public readonly tenantId: string,
    code: SupplierCode,
    name: SupplierName,
    normalizedName: NormalizedSupplierName,
    status: SupplierStatus,
    public readonly createdAt: DateTime,
    updatedAt: DateTime,
    identificationNumber?: LegalIdentificationNumber,
    contactInfo?: SupplierContactInfo,
  ) {
    this._code = code;
    this._name = name;
    this._normalizedName = normalizedName;
    this._identificationNumber = identificationNumber;
    this._contactInfo = contactInfo;
    this._status = status;
    this._updatedAt = updatedAt;
  }

  public static create(props: CreateSupplierProps): Supplier {
    const id = props.id ?? generateSupplierId();
    const normalizedName = NormalizedSupplierName.fromSupplierName(props.name);
    return new Supplier(
      id,
      props.tenantId,
      props.code,
      props.name,
      normalizedName,
      SupplierStatus.ACTIVE,
      props.now,
      props.now,
      props.identificationNumber,
      props.contactInfo,
    );
  }

  public static rehydrate(snapshot: SupplierSnapshot): Supplier {
    return new Supplier(
      supplierIdFrom(snapshot.id),
      snapshot.tenantId,
      SupplierCode.from(snapshot.code),
      SupplierName.from(snapshot.name),
      NormalizedSupplierName.from(snapshot.normalizedName),
      SupplierStatus.from(snapshot.status),
      DateTime.parse(snapshot.createdAt),
      DateTime.parse(snapshot.updatedAt),
      snapshot.identificationNumber
        ? LegalIdentificationNumber.from(snapshot.identificationNumber)
        : undefined,
      snapshot.contactInfo ? SupplierContactInfo.create(snapshot.contactInfo) : undefined,
    );
  }

  public get code(): SupplierCode {
    return this._code;
  }

  public get name(): SupplierName {
    return this._name;
  }

  public get normalizedName(): NormalizedSupplierName {
    return this._normalizedName;
  }

  public get identificationNumber(): LegalIdentificationNumber | undefined {
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

  public update(props: UpdateSupplierProps): void {
    if (props.code) {
      this._code = props.code;
    }
    if (props.name) {
      this._name = props.name;
      this._normalizedName = NormalizedSupplierName.fromSupplierName(props.name);
    }
    if (props.identificationNumber !== undefined) {
      this._identificationNumber =
        props.identificationNumber === null ? undefined : props.identificationNumber;
    }
    if (props.contactInfo !== undefined) {
      this._contactInfo = props.contactInfo === null ? undefined : props.contactInfo;
    }
    this._updatedAt = props.now;
  }

  public deactivate(now: DateTime): Result<void, DomainError> {
    if (this._status.isInactive()) {
      return Result.fail(new SupplierAlreadyInactiveError(this.id.value));
    }
    this._status = SupplierStatus.INACTIVE;
    this._updatedAt = now;
    return Result.ok(undefined);
  }

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
      normalizedName: this._normalizedName.value,
      identificationNumber: this._identificationNumber?.value ?? null,
      contactInfo: this._contactInfo ? this._contactInfo.toJSON() : null,
      status: this._status.value,
      createdAt: this.createdAt.toIsoString(),
      updatedAt: this._updatedAt.toIsoString(),
    };
  }
}
