import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import type { DateTime } from '../../../../shared/time/date-time.js';
import { SessionAlreadyRevokedError } from '../errors/authentication.errors.js';
import { generateSessionId, sessionIdFrom, type SessionId } from '../value-objects/session-id.js';
import { SessionTokenHash } from '../value-objects/session-token-hash.js';
import { userIdFrom, type UserId } from '../value-objects/user-id.js';

/**
 * The Identity module's AuthSession aggregate root (IAM-005; TECH-006;
 * ADR-010 section 11).
 *
 * An AuthSession is *the state that says a verified user is currently
 * authenticated*. It is what makes authentication durable across requests
 * without re-sending the secret, and it is deliberately the only such
 * mechanism: this issue introduces one authentication mechanism, not a second
 * one beside it.
 *
 * What the aggregate holds and why:
 *
 * - a stable UUID identity (`SessionId`), generated per sign-in, so a session
 *   can be named in an audit record and invalidated on its own;
 * - the authenticated user's identity (`UserId`) — and **nothing else about the
 *   user**, so a rename or a status change never has to be propagated into a
 *   session, and a session read can never carry profile data;
 * - a {@link SessionTokenHash} — the digest of the bearer token, never the
 *   token: the value stored is useless as a credential, so a leaked database
 *   read does not hand out sessions;
 * - `expiresAt`, an absolute instant computed from the approved session
 *   lifetime, so expiry is a property of the record rather than a rule a
 *   handler has to remember;
 * - `revokedAt`, set when the session is explicitly invalidated (sign-out, or a
 *   credential change), which is what makes invalidation durable and auditable
 *   rather than a deletion nobody can examine.
 *
 * Three properties are load-bearing:
 *
 * - **Expiry and invalidation are different states, and both are terminal.**
 *   `isUsable(now)` is the single question a validator asks; nothing "extends"
 *   or "refreshes" a session in place, so a stolen token cannot be kept alive
 *   by the person who stole it.
 * - **Fail closed.** An unknown, expired or invalidated session is refused — a
 *   validator never treats "cannot tell" as "still valid" (ADR-010 section 13).
 * - **No tenant, no role, no permission.** An authenticated session proves
 *   *who* the user is; it grants access to no tenant and carries no
 *   authorization decision. Tenant access stays dependent on the membership
 *   relationship and on later authorization rules, so nothing here could be
 *   mistaken for a grant.
 *
 * The class is framework-free by contract: it imports the shared kernel and its
 * own module only. The application supplies a `DateTime` for every read or
 * mutation so the domain never reads the clock itself and a test can fix time.
 */

/** The plain state of a session, as storage and mapping see it. */
export interface AuthSessionSnapshot {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: DateTime;
  readonly revokedAt: DateTime | undefined;
  readonly createdAt: DateTime;
  readonly updatedAt: DateTime;
}

export class AuthSession {
  private readonly _id: SessionId;
  private readonly _userId: UserId;
  private readonly _tokenHash: SessionTokenHash;
  private readonly _expiresAt: DateTime;
  private _revokedAt: DateTime | undefined;
  private readonly _createdAt: DateTime;
  private _updatedAt: DateTime;

  private constructor(
    id: SessionId,
    userId: UserId,
    tokenHash: SessionTokenHash,
    expiresAt: DateTime,
    revokedAt: DateTime | undefined,
    createdAt: DateTime,
    updatedAt: DateTime,
  ) {
    this._id = id;
    this._userId = userId;
    this._tokenHash = tokenHash;
    this._expiresAt = expiresAt;
    this._revokedAt = revokedAt;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  /**
   * Establishes a new authenticated session for a verified user.
   *
   * The token digest and the expiry instant are computed by the application
   * (from the token adapter and the configured lifetime) *before* this is
   * called, so the aggregate models a session whose lifetime is already
   * decided. Verification of the credentials and of the user's lifecycle is the
   * application's decision; this aggregate models a session that is allowed to
   * exist.
   *
   * @param input.userId — the authenticated user's identity.
   * @param input.tokenHash — the digest of the token handed to the client.
   * @param input.expiresAt — the absolute instant the session stops being accepted.
   * @param input.now — the creation instant.
   * @throws InvalidPrimitiveError — `expiresAt` is not after `now`, which would
   * create a session that was never usable. A non-positive configured lifetime
   * is a configuration error and must surface here, not as a silent rejection.
   */
  public static create(input: {
    userId: UserId;
    tokenHash: SessionTokenHash;
    expiresAt: DateTime;
    now: DateTime;
  }): AuthSession {
    if (!input.expiresAt.isAfter(input.now)) {
      throw new InvalidPrimitiveError(
        'AuthSession',
        'expiresAt must be after the session creation instant',
      );
    }

    return new AuthSession(
      generateSessionId(),
      input.userId,
      input.tokenHash,
      input.expiresAt,
      undefined,
      input.now,
      input.now,
    );
  }

  /**
   * Rebuilds a session from stored state.
   *
   * Values are re-validated through their value objects, so a broken record
   * fails loudly at the boundary instead of entering the domain as an
   * impossible state.
   */
  public static rehydrate(snapshot: AuthSessionSnapshot): AuthSession {
    return new AuthSession(
      sessionIdFrom(snapshot.id),
      userIdFrom(snapshot.userId),
      SessionTokenHash.from(snapshot.tokenHash),
      snapshot.expiresAt,
      snapshot.revokedAt,
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  /** The stable session identity, used to name this session in audit records. */
  public get id(): SessionId {
    return this._id;
  }

  /** The authenticated user's identity; never changes. */
  public get userId(): UserId {
    return this._userId;
  }

  /** The digest of the token; the token itself is never stored. */
  public get tokenHash(): SessionTokenHash {
    return this._tokenHash;
  }

  /** When this session stops being accepted. */
  public get expiresAt(): DateTime {
    return this._expiresAt;
  }

  /** When this session was invalidated, or `undefined` while it has not been. */
  public get revokedAt(): DateTime | undefined {
    return this._revokedAt;
  }

  /** When the session was established; never changes. */
  public get createdAt(): DateTime {
    return this._createdAt;
  }

  /** When the session state last changed. */
  public get updatedAt(): DateTime {
    return this._updatedAt;
  }

  /** The session identity as a plain string, convenient for mapping and logging. */
  public sessionId(): string {
    return this._id.value;
  }

  /** The authenticated user's identity as a plain string. */
  public userIdValue(): string {
    return this._userId.value;
  }

  /** Whether this session was explicitly invalidated. */
  public isRevoked(): boolean {
    return this._revokedAt !== undefined;
  }

  /**
   * Whether the session's lifetime has ended at `now`.
   *
   * Expiry is inclusive of the boundary: at exactly `expiresAt` the session is
   * no longer accepted, so a configured lifetime of *n* minutes means *n*
   * minutes of use, not *n* minutes plus one instant of ambiguity.
   */
  public isExpired(now: DateTime): boolean {
    return !now.isBefore(this._expiresAt);
  }

  /**
   * Whether this session may be accepted as authentication at `now`.
   *
   * The single decision point the validation use case uses: revoked or expired
   * is refused, and there is no third answer.
   */
  public isUsable(now: DateTime): boolean {
    return !this.isRevoked() && !this.isExpired(now);
  }

  /**
   * Invalidates the session explicitly.
   *
   * The record is kept — invalidation is a state, not a deletion — so the audit
   * trail can still name the session that was signed out, and a session that
   * was invalidated can never be silently "un-revoked" because nothing clears
   * the instant.
   *
   * @throws SessionAlreadyRevokedError — invalidating twice is refused rather
   * than reported as success, so a caller cannot believe it invalidated
   * something it did not.
   */
  public revoke(now: DateTime): void {
    if (this.isRevoked()) {
      throw new SessionAlreadyRevokedError();
    }

    this._revokedAt = now;
    this._updatedAt = now;
  }

  /**
   * The aggregate's current state as plain values.
   *
   * Used by adapters that translate to a row and by test doubles that must not
   * hand out the live instance; it is a copy, so mutating the result cannot
   * reach back into this aggregate. It contains the token digest and is
   * therefore for storage only — no view, DTO or event is built from it.
   */
  public snapshot(): AuthSessionSnapshot {
    return {
      id: this._id.value,
      userId: this._userId.value,
      tokenHash: this._tokenHash.value,
      expiresAt: this._expiresAt,
      revokedAt: this._revokedAt,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  /** A deep-frozen copy of the state, safe to hand to another layer. */
  public freeze(): Readonly<AuthSessionSnapshot> {
    return Object.freeze({ ...this.snapshot() });
  }

  /** Two sessions are the same session when their ids match. */
  public equals(other: AuthSession): boolean {
    return this._id.equals(other._id);
  }

  /** Names the session and its user; the token digest never reaches a log line. */
  public toString(): string {
    return `AuthSession(${this._id.value}, user=${this._userId.value})`;
  }
}
