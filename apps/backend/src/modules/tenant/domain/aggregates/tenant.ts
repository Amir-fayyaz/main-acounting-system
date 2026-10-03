import type { DateTime } from '../../../../shared/time/date-time.js';
import type { TenantId } from '../value-objects/tenant-id.js';
import { tenantIdFrom, generateTenantId } from '../value-objects/tenant-id.js';
import {
  InactiveTenantError,
  InvalidTenantStatusTransitionError,
} from '../errors/tenant.errors.js';
import { TenantName } from '../value-objects/tenant-name.js';
import { TenantStatus, type TenantStatusValue } from '../value-objects/tenant-status.js';

/**
 * The Tenant aggregate root (IAM-001; doc 04 section 3, doc 09-domain/01).
 *
 * A tenant is the root business boundary for tenant-owned data: every
 * financial operation belongs to one, and its identity is the tenant identity
 * the rest of the system scopes by. This aggregate holds only the tenant-level
 * information required at this stage — a stable id, a name, a lifecycle state
 * and its timestamps — and deliberately nothing else. Users, memberships,
 * roles, settings, accounting configuration and subscriptions belong to later
 * issues or other modules and are **not** modelled here.
 *
 * Three properties are load-bearing:
 *
 * - **Stable identity.** The id is chosen once, at creation, and this aggregate
 *   has no operation that changes it. Reuse for another tenant is impossible
 *   by construction: every creation generates a fresh id, and storage enforces
 *   the primary key.
 * - **A guarded lifecycle.** Only the transitions the domain allows are
 *   exposed; an illegal move is refused with a `DomainError` rather than
 *   silently ignored. Mutable profile attributes can only change while the
 *   tenant is active.
 * - **Historical safety.** The aggregate holds *current* state. A rename or a
 *   status change touches this tenant and nothing else: it never reaches back
 *   into a record that referenced the tenant, so a snapshot taken elsewhere
 *   keeps the value it was taken with (the issue's historical-safety
 *   requirement; ADR-003 sections 7–9).
 *
 * The class is framework-free by contract: it may import the shared kernel and
 * its own module only, and never a transport, an ORM or the ambient tenant
 * scope. The application passes the tenant identity in as an explicit input
 * and maps it to the tenant context where a boundary is needed.
 */

/** The plain state of a tenant, as storage and mapping see it. */
export interface TenantSnapshot {
  readonly id: string;
  readonly name: string;
  readonly status: TenantStatusValue;
  readonly createdAt: DateTime;
  readonly updatedAt: DateTime;
}

export class Tenant {
  private constructor(
    private readonly _id: TenantId,
    private _name: TenantName,
    private _status: TenantStatus,
    private readonly _createdAt: DateTime,
    private _updatedAt: DateTime,
  ) {}

  /**
   * Creates a new tenant in its initial lifecycle state.
   *
   * @param input.name — the validated name.
   * @param input.now — the creation instant, supplied by the application so the
   * domain never reads the clock itself and a test can fix time.
   * @param input.id — an explicit identity, for rehydration-style tests; a
   * fresh, globally unique id is generated when it is omitted.
   */
  public static create(input: { name: TenantName; now: DateTime; id?: TenantId }): Tenant {
    const id = input.id ?? generateTenantId();

    return new Tenant(id, input.name, TenantStatus.ACTIVE, input.now, input.now);
  }

  /**
   * Rebuilds a tenant from stored state.
   *
   * Values are re-validated through their value objects, so a broken record
   * fails loudly at the boundary instead of entering the domain as an
   * impossible state.
   */
  public static rehydrate(snapshot: TenantSnapshot): Tenant {
    return new Tenant(
      tenantIdFrom(snapshot.id),
      TenantName.from(snapshot.name),
      TenantStatus.from(snapshot.status),
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  /** The stable, never-reused tenant identity. */
  public get id(): TenantId {
    return this._id;
  }

  /** The current name. */
  public get name(): TenantName {
    return this._name;
  }

  /** The current lifecycle state. */
  public get status(): TenantStatus {
    return this._status;
  }

  /** When the tenant was created. */
  public get createdAt(): DateTime {
    return this._createdAt;
  }

  /** When any mutable attribute last changed. */
  public get updatedAt(): DateTime {
    return this._updatedAt;
  }

  /**
   * The tenant identity as the tenant boundary string (SHR-007).
   *
   * The aggregate does not know what a tenant context is — it only states that
   * its id *is* the boundary the application will scope operations by. Exposing
   * it here keeps that relationship in one documented place instead of leaving
   * each caller to decide which field to use.
   */
  public tenantId(): string {
    return this._id.value;
  }

  /**
   * Changes the tenant's name.
   *
   * @throws InactiveTenantError — the tenant is not active. Deactivation is
   * how the domain stops a tenant's current state from changing.
   */
  public rename(name: TenantName, now: DateTime): void {
    this.assertActive();
    this._name = name;
    this._updatedAt = now;
  }

  /**
   * Takes the tenant out of use. The record and its history are retained.
   *
   * @throws InvalidTenantStatusTransitionError — the tenant is already
   * inactive.
   */
  public deactivate(now: DateTime): void {
    if (!this._status.isActive()) {
      throw new InvalidTenantStatusTransitionError(this._status.value, 'inactive');
    }
    this._status = TenantStatus.INACTIVE;
    this._updatedAt = now;
  }

  /**
   * Puts an inactive tenant back into use.
   *
   * @throws InvalidTenantStatusTransitionError — the tenant is already active.
   */
  public activate(now: DateTime): void {
    if (!this._status.isInactive()) {
      throw new InvalidTenantStatusTransitionError(this._status.value, 'active');
    }
    this._status = TenantStatus.ACTIVE;
    this._updatedAt = now;
  }

  /** Whether the tenant may change its current profile attributes. */
  public isActive(): boolean {
    return this._status.isActive();
  }

  /**
   * The aggregate's current state as plain values.
   *
   * Used by adapters that translate to a row and by test doubles that must not
   * hand out the live instance; it is a copy, so mutating the result cannot
   * reach back into this aggregate.
   */
  public snapshot(): TenantSnapshot {
    return {
      id: this._id.value,
      name: this._name.value,
      status: this._status.value,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  private assertActive(): void {
    if (!this._status.isActive()) {
      throw new InactiveTenantError();
    }
  }
}
