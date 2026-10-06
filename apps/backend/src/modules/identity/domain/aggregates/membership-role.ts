import type { DateTime } from '../../../../shared/time/date-time.js';
import { InvalidRoleAssignmentTransitionError } from '../errors/membership-role.errors.js';
import {
  generateMembershipRoleId,
  membershipRoleIdFrom,
  type MembershipRoleId,
} from '../value-objects/membership-role-id.js';
import {
  MembershipRoleStatus,
  type MembershipRoleStatusValue,
} from '../value-objects/membership-role-status.js';
import { membershipIdFrom, type MembershipId } from '../value-objects/membership-id.js';
import { roleIdFrom, type RoleId } from '../value-objects/role-id.js';
import { tenantReferenceFrom, type TenantReference } from '../value-objects/tenant-reference.js';

/**
 * The Identity module's Membership-Role assignment aggregate root (IAM-004).
 *
 * An assignment is the fact that *one membership holds one role*. Modelling it
 * as its own record — rather than burying a set of role ids inside the
 * membership — is what makes "removing a role" a lifecycle move instead of a
 * delete: the assignment is deactivated, so the tenant keeps the history of who
 * held what, and re-assigning the same role later reactivates the same record.
 *
 * The aggregate carries:
 *
 * - a stable UUID identity (`MembershipRoleId`), chosen once and never reused;
 * - the tenant's stable identity (`TenantReference`) — the tenant the assignment
 *   belongs to, so a cross-tenant role can never be assigned;
 * - the membership (`MembershipId`) and the role (`RoleId`) it relates, both by
 *   identity only;
 * - a lifecycle state (`MembershipRoleStatus`: active / inactive);
 * - created / updated UTC instants.
 *
 * Two properties are load-bearing:
 *
 * - **One record per (Membership, Role) pair.** There is no operation that
 *   re-points an assignment at another membership or role, and storage enforces
 *   the pair's uniqueness — so a role cannot be held twice and a role from
 *   another tenant cannot enter the pair.
 * - **Removal is deactivation.** `deactivate` keeps the record; `activate`
 *   restores it. Only active assignments contribute to effective permissions,
 *   and deactivation touches neither the membership nor the role.
 *
 * The application decides whether the membership and role exist, whether they
 * belong to the same tenant, and whether an assignment for the pair already
 * exists; the aggregate models an assignment that is allowed to exist.
 */

/** The plain state of an assignment, as storage and mapping see it. */
export interface MembershipRoleSnapshot {
  readonly id: string;
  readonly tenantId: string;
  readonly membershipId: string;
  readonly roleId: string;
  readonly status: MembershipRoleStatusValue;
  readonly createdAt: DateTime;
  readonly updatedAt: DateTime;
}

export class MembershipRole {
  private constructor(
    private readonly _id: MembershipRoleId,
    private readonly _tenantId: TenantReference,
    private readonly _membershipId: MembershipId,
    private readonly _roleId: RoleId,
    private _status: MembershipRoleStatus,
    private readonly _createdAt: DateTime,
    private _updatedAt: DateTime,
  ) {}

  /**
   * Creates a new, active assignment of a role to a membership.
   *
   * @param input.tenantId — the tenant both the membership and the role belong to.
   * @param input.membershipId — the membership that holds the role.
   * @param input.roleId — the role being held.
   * @param input.now — the creation instant.
   * @param input.id — an explicit identity, for rehydration-style tests.
   * @param input.status — an explicit starting state; `active` by default (used
   * when re-assigning reactivates an existing record).
   */
  public static assign(input: {
    tenantId: TenantReference;
    membershipId: MembershipId;
    roleId: RoleId;
    now: DateTime;
    id?: MembershipRoleId;
    status?: MembershipRoleStatus;
  }): MembershipRole {
    return new MembershipRole(
      input.id ?? generateMembershipRoleId(),
      input.tenantId,
      input.membershipId,
      input.roleId,
      input.status ?? MembershipRoleStatus.ACTIVE,
      input.now,
      input.now,
    );
  }

  /**
   * Rebuilds an assignment from stored state.
   *
   * Values are re-validated through their value objects, so a broken record
   * fails loudly at the boundary instead of entering the domain as an
   * impossible state.
   */
  public static rehydrate(snapshot: MembershipRoleSnapshot): MembershipRole {
    return new MembershipRole(
      membershipRoleIdFrom(snapshot.id),
      tenantReferenceFrom(snapshot.tenantId),
      membershipIdFrom(snapshot.membershipId),
      roleIdFrom(snapshot.roleId),
      MembershipRoleStatus.from(snapshot.status),
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  /** The stable, never-reused assignment identity. */
  public get id(): MembershipRoleId {
    return this._id;
  }

  /** The stable identity of the tenant the assignment belongs to. */
  public get tenantId(): TenantReference {
    return this._tenantId;
  }

  /** The membership that holds the role. */
  public get membershipId(): MembershipId {
    return this._membershipId;
  }

  /** The role being held. */
  public get roleId(): RoleId {
    return this._roleId;
  }

  /** The current lifecycle state. */
  public get status(): MembershipRoleStatus {
    return this._status;
  }

  /** When the assignment was created; never changes. */
  public get createdAt(): DateTime {
    return this._createdAt;
  }

  /** When the assignment last changed. */
  public get updatedAt(): DateTime {
    return this._updatedAt;
  }

  /** The assignment identity as a plain string, convenient for mapping. */
  public assignmentId(): string {
    return this._id.value;
  }

  /** Whether the role is currently held through this assignment. */
  public isActive(): boolean {
    return this._status.isActive();
  }

  /**
   * Puts a removed role back into force for the membership.
   *
   * @throws InvalidRoleAssignmentTransitionError — the assignment is already active.
   */
  public activate(now: DateTime): void {
    if (!this._status.isInactive()) {
      throw new InvalidRoleAssignmentTransitionError(this._status.value, 'active');
    }
    this._status = MembershipRoleStatus.ACTIVE;
    this._updatedAt = now;
  }

  /**
   * Removes the role from the membership by deactivating the assignment. The
   * record is retained, and neither the membership nor the role is affected.
   *
   * @throws InvalidRoleAssignmentTransitionError — the assignment is already inactive.
   */
  public deactivate(now: DateTime): void {
    if (!this._status.isActive()) {
      throw new InvalidRoleAssignmentTransitionError(this._status.value, 'inactive');
    }
    this._status = MembershipRoleStatus.INACTIVE;
    this._updatedAt = now;
  }

  /**
   * The aggregate's current state as plain values.
   *
   * Used by adapters that translate to a row and by test doubles that must not
   * hand out the live instance; it is a copy, so mutating the result cannot
   * reach back into this aggregate.
   */
  public snapshot(): MembershipRoleSnapshot {
    return {
      id: this._id.value,
      tenantId: this._tenantId.value,
      membershipId: this._membershipId.value,
      roleId: this._roleId.value,
      status: this._status.value,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  /** A deep-frozen copy of the public state, safe to hand to another layer. */
  public freeze(): Readonly<MembershipRoleSnapshot> {
    return Object.freeze({ ...this.snapshot() });
  }

  /** Two assignments are the same assignment when their ids match. */
  public equals(other: MembershipRole): boolean {
    return this._id.equals(other._id);
  }

  public toString(): string {
    return `MembershipRole(${this._id.value})`;
  }
}
