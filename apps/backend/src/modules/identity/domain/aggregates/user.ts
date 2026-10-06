import { DateTime } from '../../../../shared/time/date-time.js';
import { InactiveUserError, InvalidUserStatusTransitionError } from '../errors/user.errors.js';
import { UserEmail } from '../value-objects/user-email.js';
import { generateUserId, userIdFrom, type UserId } from '../value-objects/user-id.js';
import { UserName } from '../value-objects/user-name.js';
import { UserStatus, type UserStatusValue } from '../value-objects/user-status.js';

/**
 * The Identity module's User aggregate root (IAM-002; doc 04, doc 09-domain).
 *
 * A User is a system identity — a person who can later participate in one or
 * more tenant memberships. It is deliberately independent of any specific
 * tenant: there is no `tenantId`, no tenant role, no tenant permission and no
 * company-specific status here. Tenant membership is introduced through a
 * separate relationship in a later issue, so nothing in this aggregate assumes
 * the user belongs to exactly one tenant (the acceptance criteria require it).
 *
 * The only tenant-independent, identity-relevant attributes this stage requires
 * are:
 *
 * - a stable UUID identity (`UserId`), chosen once and never reused;
 * - a display name (`UserName`);
 * - a primary contact email (`UserEmail`);
 * - a lifecycle status (`UserStatus`: active / inactive);
 * - created / updated UTC instants.
 *
 * Three properties are load-bearing:
 *
 * - **Stable identity.** The id is generated at creation and this aggregate has
 *   no operation that changes it, so reuse for another person is impossible by
 *   construction.
 * - **A guarded lifecycle.** Only the transitions the domain allows are
 *   exposed; an illegal move is refused with a `DomainError` rather than
 *   silently ignored.
 * - **Historical safety.** The aggregate holds *current* state. A rename or a
 *   status change touches this user and nothing else: it never reaches back into
 *   a record that referenced the user, so a snapshot taken elsewhere keeps the
 *   value it was taken with (the issue's historical-safety requirement;
 *   ADR-003 sections 7–9).
 *
 * The class is framework-free by contract: it imports the shared kernel and its
 * own module only, and never a transport, an ORM or any ambient context. The
 * application supplies a `DateTime` for every mutation so the domain never
 * reads the clock itself and a test can fix time.
 */

/** The plain state of a user, as storage and mapping see it. */
export interface UserSnapshot {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly status: UserStatusValue;
  readonly createdAt: DateTime;
  readonly updatedAt: DateTime;
}

export class User {
  private constructor(
    private readonly _id: UserId,
    private _displayName: UserName,
    private _email: UserEmail,
    private _status: UserStatus,
    private readonly _createdAt: DateTime,
    private _updatedAt: DateTime,
  ) {}

  /**
   * Creates a new, active user.
   *
   * Generation of the id, both timestamps and the initial `active` status are
   * part of creation, so a caller never hands in a provisional status or
   * timestamp.
   *
   * @param input.displayName — the raw display name; validated and normalized
   * by {@link UserName}.
   * @param input.email — the raw primary contact email; validated and
   * normalized by {@link UserEmail}.
   * @param input.now — the creation instant.
   */
  public static create(input: { displayName: string; email: string; now: DateTime }): User {
    return new User(
      generateUserId(),
      UserName.from(input.displayName),
      UserEmail.from(input.email),
      UserStatus.ACTIVE,
      input.now,
      input.now,
    );
  }

  /**
   * Rebuilds a user from stored state.
   *
   * Values are re-validated through their value objects, so a broken record
   * fails loudly at the boundary instead of entering the domain as an
   * impossible state.
   */
  public static rehydrate(snapshot: UserSnapshot): User {
    return new User(
      userIdFrom(snapshot.id),
      UserName.from(snapshot.displayName),
      UserEmail.from(snapshot.email),
      UserStatus.from(snapshot.status),
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  /** The stable, never-reused user identity. */
  public get id(): UserId {
    return this._id;
  }

  /** The current display name. */
  public get displayName(): UserName {
    return this._displayName;
  }

  /** The current primary contact email. */
  public get email(): UserEmail {
    return this._email;
  }

  /** The current lifecycle status. */
  public get status(): UserStatus {
    return this._status;
  }

  /** When the user was created; never changes. */
  public get createdAt(): DateTime {
    return this._createdAt;
  }

  /** When any mutable attribute last changed. */
  public get updatedAt(): DateTime {
    return this._updatedAt;
  }

  /** The user identity as a plain string, convenient for logging / mapping. */
  public userId(): string {
    return this._id.value;
  }

  /** Whether this user is currently usable / active. */
  public isActive(): boolean {
    return this._status.isActive();
  }

  /**
   * Changes the display name.
   *
   * @throws InactiveUserError — the user is not active.
   */
  public rename(name: UserName, now: DateTime): void {
    this.assertActive();
    this._displayName = name;
    this._updatedAt = now;
  }

  /**
   * Changes the primary contact email.
   *
   * @throws InactiveUserError — the user is not active.
   */
  public changeEmail(email: UserEmail, now: DateTime): void {
    this.assertActive();
    this._email = email;
    this._updatedAt = now;
  }

  /**
   * Moves an active user to inactive.
   *
   * @throws InvalidUserStatusTransitionError — the user is already inactive.
   */
  public deactivate(now: DateTime): void {
    if (!this._status.isActive()) {
      throw new InvalidUserStatusTransitionError(this._status.value, 'inactive');
    }
    this._status = UserStatus.INACTIVE;
    this._updatedAt = now;
  }

  /**
   * Puts an inactive user back into use.
   *
   * @throws InvalidUserStatusTransitionError — the user is already active.
   */
  public activate(now: DateTime): void {
    if (!this._status.isInactive()) {
      throw new InvalidUserStatusTransitionError(this._status.value, 'active');
    }
    this._status = UserStatus.ACTIVE;
    this._updatedAt = now;
  }

  /**
   * The aggregate's current state as plain values.
   *
   * Used by adapters that translate to a row and by test doubles that must not
   * hand out the live instance; it is a copy, so mutating the result cannot
   * reach back into this aggregate.
   */
  public snapshot(): UserSnapshot {
    return {
      id: this._id.value,
      displayName: this._displayName.value,
      email: this._email.value,
      status: this._status.value,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  /** A deep-frozen copy of the public state, safe to hand to another layer. */
  public freeze(): Readonly<UserSnapshot> {
    return Object.freeze({ ...this.snapshot() });
  }

  /** Two users are the same user when their ids match. */
  public equals(other: User): boolean {
    return this._id.equals(other._id);
  }

  public toString(): string {
    return `User(${this._id.value})`;
  }

  private assertActive(): void {
    if (!this._status.isActive()) {
      throw new InactiveUserError();
    }
  }
}
