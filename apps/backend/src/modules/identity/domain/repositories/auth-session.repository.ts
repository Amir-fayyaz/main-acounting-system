import type { DateTime } from '../../../../shared/time/date-time.js';
import type {
  AddsAggregate,
  Loaded,
  LoadsById,
  UpdatesAggregate,
} from '../../../../shared/persistence/repository-ports.js';
import type { AuthSession } from '../aggregates/auth-session.js';
import type { SessionId } from '../value-objects/session-id.js';
import type { SessionTokenHash } from '../value-objects/session-token-hash.js';
import type { UserId } from '../value-objects/user-id.js';

/**
 * The Identity module's repository for authentication sessions (IAM-005;
 * SHR-004; SHR-008).
 *
 * It is assembled from the shared persistence capabilities (`LoadsById`,
 * `AddsAggregate`, `UpdatesAggregate`) plus the two closed criteria this issue
 * needs:
 *
 * - **`findByTokenHash`** is how a presented bearer token becomes a session. The
 *   criterion is a digest, never the token: the adapter compares a one-way value,
 *   so a token cannot be recovered from a query, a log or a dump, and the lookup
 *   is an indexed equality rather than a scan matching a secret.
 * - **`revokeActiveForUser`** invalidates every usable session of one user in a
 *   single statement, which is what makes a credential change end the sessions
 *   the old secret had established. It reports how many records it invalidated,
 *   so the audit record can state the effect instead of guessing it.
 *
 * There is deliberately no delete and no "delete expired" operation: an expired
 * or invalidated session is kept for the audit trail and refused by
 * `AuthSession.isUsable`, and cleanup of old records is a retention decision for
 * a later issue rather than an implicit side effect of authentication.
 *
 * The interface lives in `domain/`; the implementation lives in
 * `infrastructure/persistence/` and is never exposed outside this module
 * (ADR-002 section 8; enforced by `src/modules/module-boundaries.spec.ts`).
 */
export interface AuthSessionRepository
  extends
    LoadsById<SessionId, AuthSession>,
    AddsAggregate<AuthSession>,
    UpdatesAggregate<AuthSession> {
  /** The session the presented token belongs to, or `undefined` when none does. */
  findByTokenHash(tokenHash: SessionTokenHash): Promise<Loaded<AuthSession> | undefined>;

  /**
   * Invalidates every session of one user that is not already invalidated, at
   * `now`, and answers how many records that was.
   *
   * Expired-but-uninvalidated sessions are included on purpose: they have ended
   * anyway, and marking them keeps the record's meaning unambiguous — "this is
   * why it stopped being accepted" is written once, at the moment the secret
   * changed, rather than inferred later from a lifetime.
   */
  revokeActiveForUser(userId: UserId, now: DateTime): Promise<number>;
}
