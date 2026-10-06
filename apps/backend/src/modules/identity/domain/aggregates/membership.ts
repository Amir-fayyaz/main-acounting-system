import type { DateTime } from '../../../../shared/time/date-time.js';
import { InvalidMembershipStatusTransitionError } from '../errors/membership.errors.js';
import {
  generateMembershipId,
  membershipIdFrom,
  type MembershipId,
} from '../value-objects/membership-id.js';
import {
  MembershipStatus,
  type MembershipStatusValue,
} from '../value-objects/membership-status.js';
import { tenantReferenceFrom, type TenantReference } from '../value-objects/tenant-reference.js';
import { userIdFrom, type UserId } from '../value-objects/user-id.js';

/**
 * The Identity module's Membership aggregate root (IAM-003; doc 04,
 * doc 09-domain/01 section 4).
 *
 * A Membership is *the access relationship* between one User and one Tenant: it
 * says that a user belongs to a tenant, and it is the foundation a later
 * authentication/authorization flow will read to decide whether a user may enter
 * a tenant context. It deliberately does not model roles, permissions,
 * invitations or tenant switching — those are separate issues.
 *
 * The aggregate is exactly the relationship and nothing more:
 *
 * - a stable UUID identity (`MembershipId`), chosen once and never reused;
 * - the User's identity (`UserId`, this module's own identity);
 * - the Tenant's stable identity (`TenantReference`, a shared `EntityId` — the
 *   tenant module stays the authority on the tenant itself, and this module
 *   never reads a tenant table, entity or repository);
 * - a lifecycle state (`MembershipStatus`: active / inactive);
 * - created / updated UTC instants.
 *
 * Three properties are load-bearing:
 *
 * - **No duplicated business data.** Nothing of the User's (name, email, status)
 *   or the Tenant's (name, status) is copied here, so a rename on either side
 *   can never have to be propagated into a relationship record. The membership
 *   refers to identities; it does not re-describe them.
 * - **A guarded lifecycle.** Only the transitions the domain allows are
 *   exposed; an illegal move is refused with a `DomainError` rather than
 *   silently ignored.
 * - **Historical safety.** Deactivating a membership changes its state and
 *   nothing else: the record survives, so an operational history that points at
 *   it stays valid. There is no delete operation anywhere, and neither the User
 *   nor the Tenant is touched by deactivation (the issue's historical-safety
 *   requirement; ADR-003 section 10).
 *
 * The class is framework-free by contract: it imports the shared kernel and its
 * own module only, and never a transport, an ORM or any ambient context. The
 * application supplies a `DateTime` for every mutation so the domain never reads
 * the clock itself and a test can fix time.
 */

/** The plain state of a membership, as storage and mapping see it. */
export interface MembershipSnapshot {
  readonly id: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly status: MembershipStatusValue;
  readonly createdAt: DateTime;
  readonly updatedAt: DateTime;
}

export class Membership {
  private constructor(
    private readonly _id: MembershipId,
    private readonly _userId: UserId,
    private readonly _tenantId: TenantReference,
    private _status: MembershipStatus,
    private readonly _createdAt: DateTime,
    private _updatedAt: DateTime,
  ) {}

  /**
   * Creates a new, active membership between an existing user and tenant.
   *
   * Generation of the id, both timestamps and the initial `active` status are
   * part of creation, so a caller never hands in a provisional status or
   * timestamp. Whether those identities actually exist, and whether a
   * membership for the pair already exists, is the application's decision
   * before this is called — the aggregate models a relationship that is
   * allowed to exist.
   *
   * @param input.userId — the existing user identity.
   * @param input.tenantId — the existing tenant's stable identity.
   * @param input.now — the creation instant.
   * @param input.id — an explicit identity, for rehydration-style tests; a
   * fresh, globally unique id is generated when it is omitted.
   */
  public static create(input: {
    userId: UserId;
    tenantId: TenantReference;
    now: DateTime;
    id?: MembershipId;
  }): Membership {
    return new Membership(
      input.id ?? generateMembershipId(),
      input.userId,
      input.tenantId,
      MembershipStatus.ACTIVE,
      input.now,
      input.now,
    );
  }

  /**
   * Rebuilds a membership from stored state.
   *
   * Values are re-validated through their value objects, so a broken record
   * fails loudly at the boundary instead of entering the domain as an
   * impossible state.
   */
  public static rehydrate(snapshot: MembershipSnapshot): Membership {
    return new Membership(
      membershipIdFrom(snapshot.id),
      userIdFrom(snapshot.userId),
      tenantReferenceFrom(snapshot.tenantId),
      MembershipStatus.from(snapshot.status),
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  /** The stable, never-reused membership identity. */
  public get id(): MembershipId {
    return this._id;
  }

  /** The identity of the user this membership belongs to. */
  public get userId(): UserId {
    return this._userId;
  }

  /** The stable identity of the tenant this membership grants access to. */
  public get tenantId(): TenantReference {
    return this._tenantId;
  }

  /** The current lifecycle state. */
  public get status(): MembershipStatus {
    return this._status;
  }

  /** When the membership was created; never changes. */
  public get createdAt(): DateTime {
    return this._createdAt;
  }

  /** When the lifecycle last changed. */
  public get updatedAt(): DateTime {
    return this._updatedAt;
  }

  /** The membership identity as a plain string, convenient for logging / mapping. */
  public membershipId(): string {
    return this._id.value;
  }

  /** The tenant identity as the tenant boundary string (SHR-007). */
  public tenantIdValue(): string {
    return this._tenantId.value;
  }

  /** Whether the relationship is currently in force. */
  public isActive(): boolean {
    return this._status.isActive();
  }

  /**
   * Puts an inactive membership back into force.
   *
   * @throws InvalidMembershipStatusTransitionError — the membership is already
   * active.
   */
  public activate(now: DateTime): void {
    if (!this._status.isInactive()) {
      throw new InvalidMembershipStatusTransitionError(this._status.value, 'active');
    }
    this._status = MembershipStatus.ACTIVE;
    this._updatedAt = now;
  }

  /**
   * Takes the relationship out of force. The record and its history are kept,
   * and neither the User nor the Tenant is affected.
   *
   * @throws InvalidMembershipStatusTransitionError — the membership is already
   * inactive.
   */
  public deactivate(now: DateTime): void {
    if (!this._status.isActive()) {
      throw new InvalidMembershipStatusTransitionError(this._status.value, 'inactive');
    }
    this._status = MembershipStatus.INACTIVE;
    this._updatedAt = now;
  }

  /**
   * The aggregate's current state as plain values.
   *
   * Used by adapters that translate to a row and by test doubles that must not
   * hand out the live instance; it is a copy, so mutating the result cannot
   * reach back into this aggregate.
   */
  public snapshot(): MembershipSnapshot {
    return {
      id: this._id.value,
      userId: this._userId.value,
      tenantId: this._tenantId.value,
      status: this._status.value,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  /** A deep-frozen copy of the public state, safe to hand to another layer. */
  public freeze(): Readonly<MembershipSnapshot> {
    return Object.freeze({ ...this.snapshot() });
  }

  /** Two memberships are the same membership when their ids match. */
  public equals(other: Membership): boolean {
    return this._id.equals(other._id);
  }

  public toString(): string {
    return `Membership(${this._id.value})`;
  }
}
