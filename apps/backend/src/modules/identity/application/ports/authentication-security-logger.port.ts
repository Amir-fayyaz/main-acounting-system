/**
 * The structured signal the authentication flow emits about lockouts (SEC-002;
 * ADR-015 section 3).
 *
 * A lockout is an operational fact an operator must be able to see — the
 * account crossed its threshold, or a locked account is still being attacked —
 * and it is deliberately *not* an audit record: the durable security trail is
 * written through `AuthenticationAuditRecorder` (AUD-001), while this port is
 * the log line a future metrics layer will consume. The two are complementary
 * and neither replaces the other (ADR-015 section 6).
 *
 * Two rules are part of the contract:
 *
 * - **No credential ever appears.** No password, hash, token or token digest is
 *   accepted by any method here, so no implementation can log one.
 * - **The threshold and the window are policy, not the account's secret.** They
 *   are logged so a signal is interpretable; the account's *remaining* lockout
 *   time is not, because a log that reported it would be a clock an attacker
 *   could read.
 *
 * The port is framework-free: which logger writes the line, and in what format,
 * is the adapter's decision.
 */

/** One lockout transition: an account crossed its threshold. */
export interface LockoutTransitionLogEntry {
  /** The account that is now locked. */
  readonly userId: string;
  /** The request's correlation id, when the caller had one. */
  readonly correlationId?: string;
  /** The configured threshold the account crossed. */
  readonly threshold: number;
  /** The configured lockout duration, in milliseconds. */
  readonly durationMs: number;
}

/** One attempt against an account that is already locked. */
export interface LockedOutAttemptLogEntry {
  /** The locked account that was targeted. */
  readonly userId: string;
  /** The request's correlation id, when the caller had one. */
  readonly correlationId?: string;
}

export interface AuthenticationSecurityLogger {
  /** Records that an account just transitioned into the locked state. */
  lockoutTransitioned(entry: LockoutTransitionLogEntry): void;

  /** Records that an authentication attempt targeted an already-locked account. */
  lockedOutAttempt(entry: LockedOutAttemptLogEntry): void;
}
