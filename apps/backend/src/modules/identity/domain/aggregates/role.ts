import type { DateTime } from '../../../../shared/time/date-time.js';
import {
  DuplicateRolePermissionError,
  InactiveRoleError,
  InvalidRoleStatusTransitionError,
  RolePermissionNotFoundError,
} from '../errors/role.errors.js';
import { generateRoleId, roleIdFrom, type RoleId } from '../value-objects/role-id.js';
import { RoleName } from '../value-objects/role-name.js';
import { RoleStatus, type RoleStatusValue } from '../value-objects/role-status.js';
import { tenantReferenceFrom, type TenantReference } from '../value-objects/tenant-reference.js';
import type { PermissionKey } from '../value-objects/permission-key.js';

/**
 * The Identity module's Role aggregate root (IAM-004; doc 09-domain/01 section 2).
 *
 * A Role is a *named collection of permissions within one tenant*: it says which
 * capabilities a membership may hold, and it is the middle link of the access
 * path the product defines —
 *
 * ```text
 * User → Membership → Role → Permissions
 * ```
 *
 * The aggregate holds only the role-level information this stage requires:
 *
 * - a stable UUID identity (`RoleId`), chosen once and never reused;
 * - the tenant's stable identity (`TenantReference`, a shared `EntityId`);
 * - a name (`RoleName`);
 * - a lifecycle state (`RoleStatus`: active / inactive);
 * - a set of permission keys (`PermissionKey`) — its capabilities;
 * - created / updated UTC instants.
 *
 * Three properties are load-bearing:
 *
 * - **Tenant-scoped.** A role belongs to exactly one tenant, and the tenant is
 *   part of its identity in access terms: a membership may only ever receive
 *   roles of its own tenant, which the application enforces before assignment.
 * - **No user data.** The aggregate names capabilities and nothing about people;
 *   attaching a role to a person is the membership's job, so tenant-specific
 *   access data never leaks into the `User` entity.
 * - **A set of permissions.** Granting is set membership, so a duplicate grant is
 *   refused rather than silently absorbed, and the permission list is emitted in
 *   a deterministic (sorted) order, so an effective permission set is stable and
 *   comparable. Deactivation preserves every assignment that points at the role.
 *
 * The class is framework-free by contract: it imports the shared kernel and its
 * own module only, and never a transport, an ORM or any ambient context. The
 * application supplies a `DateTime` for every mutation so the domain never reads
 * the clock itself and a test can fix time.
 */

/** The plain state of a role, as storage and mapping see it. */
export interface RoleSnapshot {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly status: RoleStatusValue;
  /** The granted capability keys, in deterministic (sorted) order. */
  readonly permissions: readonly string[];
  readonly createdAt: DateTime;
  readonly updatedAt: DateTime;
}

export class Role {
  private constructor(
    private readonly _id: RoleId,
    private readonly _tenantId: TenantReference,
    private _name: RoleName,
    private _status: RoleStatus,
    private readonly _permissions: Set<string>,
    private readonly _createdAt: DateTime,
    private _updatedAt: DateTime,
  ) {}

  /**
   * Creates a new, active role within a tenant.
   *
   * Generation of the id, both timestamps and the initial `active` status are
   * part of creation, so a caller never hands in a provisional status or
   * timestamp. Whether the tenant exists, and whether the given permission keys
   * are known capabilities, is the application's decision before this is called.
   */
  public static create(input: {
    tenantId: TenantReference;
    name: RoleName;
    now: DateTime;
    permissions?: readonly PermissionKey[];
    id?: RoleId;
  }): Role {
    return new Role(
      input.id ?? generateRoleId(),
      input.tenantId,
      input.name,
      RoleStatus.ACTIVE,
      new Set((input.permissions ?? []).map((permission) => permission.value)),
      input.now,
      input.now,
    );
  }

  /**
   * Rebuilds a role from stored state.
   *
   * Values are re-validated through their value objects, so a broken record
   * fails loudly at the boundary instead of entering the domain as an
   * impossible state.
   */
  public static rehydrate(snapshot: RoleSnapshot): Role {
    return new Role(
      roleIdFrom(snapshot.id),
      tenantReferenceFrom(snapshot.tenantId),
      RoleName.from(snapshot.name),
      RoleStatus.from(snapshot.status),
      new Set(snapshot.permissions),
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  /** The stable, never-reused role identity. */
  public get id(): RoleId {
    return this._id;
  }

  /** The stable identity of the tenant that owns this role. */
  public get tenantId(): TenantReference {
    return this._tenantId;
  }

  /** The current name. */
  public get name(): RoleName {
    return this._name;
  }

  /** The current lifecycle state. */
  public get status(): RoleStatus {
    return this._status;
  }

  /** When the role was created; never changes. */
  public get createdAt(): DateTime {
    return this._createdAt;
  }

  /** When the role last changed. */
  public get updatedAt(): DateTime {
    return this._updatedAt;
  }

  /** The role identity as a plain string, convenient for logging / mapping. */
  public roleId(): string {
    return this._id.value;
  }

  /** The tenant identity as the tenant boundary string (SHR-007). */
  public tenantIdValue(): string {
    return this._tenantId.value;
  }

  /** Whether the role may be assigned and its permissions are effective. */
  public isActive(): boolean {
    return this._status.isActive();
  }

  /** Whether the role currently grants `key`. */
  public hasPermission(key: PermissionKey): boolean {
    return this._permissions.has(key.value);
  }

  /** How many capabilities the role grants. */
  public permissionCount(): number {
    return this._permissions.size;
  }

  /** The granted capability keys, in deterministic order. */
  public permissions(): readonly string[] {
    return [...this._permissions].sort();
  }

  /**
   * Changes the role's name.
   *
   * @throws InactiveRoleError — the role is not active.
   */
  public rename(name: RoleName, now: DateTime): void {
    this.assertActive();
    this._name = name;
    this._updatedAt = now;
  }

  /**
   * Adds a capability to the role.
   *
   * @throws InactiveRoleError — the role is not active.
   * @throws DuplicateRolePermissionError — the role already grants the key.
   */
  public grantPermission(key: PermissionKey, now: DateTime): void {
    this.assertActive();
    if (this._permissions.has(key.value)) {
      throw new DuplicateRolePermissionError(key.value);
    }
    this._permissions.add(key.value);
    this._updatedAt = now;
  }

  /**
   * Removes a capability from the role.
   *
   * @throws InactiveRoleError — the role is not active.
   * @throws RolePermissionNotFoundError — the role does not grant the key.
   */
  public revokePermission(key: PermissionKey, now: DateTime): void {
    this.assertActive();
    if (!this._permissions.has(key.value)) {
      throw new RolePermissionNotFoundError(key.value);
    }
    this._permissions.delete(key.value);
    this._updatedAt = now;
  }

  /**
   * Moves an active role to inactive. Every assignment that points at the role
   * is retained; the role simply stops conferring access.
   *
   * @throws InvalidRoleStatusTransitionError — the role is already inactive.
   */
  public deactivate(now: DateTime): void {
    if (!this._status.isActive()) {
      throw new InvalidRoleStatusTransitionError(this._status.value, 'inactive');
    }
    this._status = RoleStatus.INACTIVE;
    this._updatedAt = now;
  }

  /**
   * Puts an inactive role back into use.
   *
   * @throws InvalidRoleStatusTransitionError — the role is already active.
   */
  public activate(now: DateTime): void {
    if (!this._status.isInactive()) {
      throw new InvalidRoleStatusTransitionError(this._status.value, 'active');
    }
    this._status = RoleStatus.ACTIVE;
    this._updatedAt = now;
  }

  /**
   * The aggregate's current state as plain values.
   *
   * Used by adapters that translate to a row and by test doubles that must not
   * hand out the live instance; it is a copy, so mutating the result cannot
   * reach back into this aggregate.
   */
  public snapshot(): RoleSnapshot {
    return {
      id: this._id.value,
      tenantId: this._tenantId.value,
      name: this._name.value,
      status: this._status.value,
      permissions: this.permissions(),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  /** A deep-frozen copy of the public state, safe to hand to another layer. */
  public freeze(): Readonly<RoleSnapshot> {
    return Object.freeze({ ...this.snapshot() });
  }

  /** Two roles are the same role when their ids match. */
  public equals(other: Role): boolean {
    return this._id.equals(other._id);
  }

  public toString(): string {
    return `Role(${this._id.value})`;
  }

  private assertActive(): void {
    if (!this._status.isActive()) {
      throw new InactiveRoleError();
    }
  }
}
