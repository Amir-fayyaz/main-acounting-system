import type { DateTime } from '../../../../shared/time/date-time.js';
import { PasswordHash } from '../value-objects/password-hash.js';
import { userIdFrom, type UserId } from '../value-objects/user-id.js';

/**
 * The Identity module's Credential aggregate root (IAM-005; TECH-006;
 * ADR-010 section 6).
 *
 * A Credential is *the secret a User authenticates with* — nothing else. It is
 * deliberately separate from the `User` aggregate, for three reasons the
 * architecture makes load-bearing:
 *
 * - **Authentication concerns stay separate from identity concerns.** A user
 *   exists without a credential (provisioning may set one later), and a
 *   credential never carries a profile attribute. Nothing about a person's name,
 *   email or lifecycle belongs here.
 * - **Secret material lives behind its own repository and use cases.** The value
 *   this aggregate holds is a {@link PasswordHash}, so a read of a user can
 *   never accidentally carry hash material, and no user view has a field that
 *   could be filled with one. The credential table is written only by the
 *   authentication flow, and its DDL stays inside this module
 *   (ADR-003 sections 4 and 14).
 * - **Storage stays inside the Identity module.** The credential is identity
 *   data, so it lives with the identity module — not in a shared kernel table
 *   and not in a second authentication store.
 *
 * The aggregate is one credential per user: its identity *is* the user's
 * identity, so "two credentials for one person" is unrepresentable rather than
 * merely discouraged, and establishing a credential twice replaces the secret
 * instead of adding a second way in.
 *
 * The class is framework-free by contract: it imports the shared kernel and its
 * own module only, and never a transport, an ORM or an ambient context. The
 * application supplies a `DateTime` for every mutation so the domain never reads
 * the clock itself and a test can fix time. The plaintext secret never enters
 * this aggregate: it is converted to a hash before creation or replacement.
 */

/** The plain state of a credential, as storage and mapping see it. */
export interface CredentialSnapshot {
  readonly userId: string;
  readonly passwordHash: string;
  readonly createdAt: DateTime;
  readonly updatedAt: DateTime;
}

export class Credential {
  private readonly _userId: UserId;
  private _passwordHash: PasswordHash;
  private readonly _createdAt: DateTime;
  private _updatedAt: DateTime;

  private constructor(
    userId: UserId,
    passwordHash: PasswordHash,
    createdAt: DateTime,
    updatedAt: DateTime,
  ) {
    this._userId = userId;
    this._passwordHash = passwordHash;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  /**
   * Establishes the credential of an existing user.
   *
   * The hash must already have been derived by the password-hashing port from a
   * validated secret, so this aggregate never sees plaintext and cannot store
   * it. Whether the user exists is the application's decision before this is
   * called — the aggregate models a credential that is allowed to exist.
   *
   * @param input.userId — the identity of the user this credential belongs to.
   * @param input.passwordHash — the derived, self-describing hash to store.
   * @param input.now — the creation instant.
   */
  public static create(input: {
    userId: UserId;
    passwordHash: PasswordHash;
    now: DateTime;
  }): Credential {
    return new Credential(input.userId, input.passwordHash, input.now, input.now);
  }

  /**
   * Rebuilds a credential from stored state.
   *
   * The encoded hash is re-validated through {@link PasswordHash}, so a broken
   * record fails loudly at the boundary instead of entering the domain as a
   * credential that could never be verified.
   */
  public static rehydrate(snapshot: CredentialSnapshot): Credential {
    return new Credential(
      userIdFrom(snapshot.userId),
      PasswordHash.from(snapshot.passwordHash),
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  /** The identity of the user this credential authenticates; never changes. */
  public get userId(): UserId {
    return this._userId;
  }

  /** The stored derivation — the only form of the secret this system keeps. */
  public get passwordHash(): PasswordHash {
    return this._passwordHash;
  }

  /** When the credential was first established; never changes. */
  public get createdAt(): DateTime {
    return this._createdAt;
  }

  /** When the stored secret last changed. */
  public get updatedAt(): DateTime {
    return this._updatedAt;
  }

  /** The user identity as a plain string, convenient for mapping and logging. */
  public userIdValue(): string {
    return this._userId.value;
  }

  /** The algorithm of the stored hash, safe to report and to record. */
  public algorithm(): string {
    return this._passwordHash.algorithm;
  }

  /**
   * Replaces the stored secret with a newly derived hash.
   *
   * Replacing is an explicit operation, never a side effect of an unrelated
   * change, in the same spirit as the SHR-004 rule against upserts: the caller
   * has to say that the secret changed, so a rotation is an auditable fact and
   * not something that happened unnoticed.
   */
  public replacePasswordHash(passwordHash: PasswordHash, now: DateTime): void {
    this._passwordHash = passwordHash;
    this._updatedAt = now;
  }

  /**
   * The aggregate's current state as plain values.
   *
   * Used by adapters that translate to a row and by test doubles that must not
   * hand out the live instance; it is a copy, so mutating the result cannot
   * reach back into this aggregate. It contains hash material and is therefore
   * for storage only — no view, DTO or event is built from it.
   */
  public snapshot(): CredentialSnapshot {
    return {
      userId: this._userId.value,
      passwordHash: this._passwordHash.encoded,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  /** A deep-frozen copy of the state, safe to hand to another layer. */
  public freeze(): Readonly<CredentialSnapshot> {
    return Object.freeze({ ...this.snapshot() });
  }

  /** Two credentials are the same credential when they belong to the same user. */
  public equals(other: Credential): boolean {
    return this._userId.equals(other._userId);
  }

  /** Names the user only; the stored hash never reaches a log line. */
  public toString(): string {
    return `Credential(${this._userId.value})`;
  }
}
