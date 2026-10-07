import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import {
  AuthenticationStateRejectedError,
  SessionExpiredError,
  SessionRevokedError,
} from '../../domain/errors/authentication.errors.js';
import {
  AuthenticationEnded,
  AuthenticationStateRejected,
  type AuthenticationStateRejectedData,
} from '../../domain/events/authentication.events.js';
import type { AuthSessionRepository } from '../../domain/repositories/auth-session.repository.js';
import { causedBy } from '../../../../shared/messaging/message.js';
import type { SignOut } from '../commands/sign-out.command.js';
import type { AuthenticationAuditRecorder } from '../ports/authentication-audit-recorder.port.js';
import { isWellFormedSessionId, parseSessionId } from '../services/authentication-input.js';
import type { SignOutView } from '../views/sign-out.view.js';

/**
 * Invalidates an authenticated session (IAM-005; ADR-010 section 9).
 *
 * Sign-out is the explicit half of the session lifecycle: expiry ends a session
 * whether anyone asked or not, and invalidation ends it *now*, at the holder's
 * request. It is a state change, not a deletion — the record gains an
 * invalidation instant and is kept, so the audit trail can still name the session
 * that ended and nothing has to be reconstructed from a missing row.
 *
 * Two structural choices are worth stating:
 *
 * - **The session is resolved, then invalidated, outside the failure paths.** A
 *   read that finds nothing, or finds a session that has already ended, writes
 *   an audit record and answers with a failure — no transaction is opened, so
 *   the audit record cannot be rolled back by the very failure it reports.
 * - **An unusable session is refused, never "revoked again".** Revalidating the
 *   state here (rather than trusting that the caller saw a usable session) is
 *   what makes the operation fail closed if the credential boundary and this use
 *   case ever disagree: a token that no longer authenticates cannot be used to
 *   perform an authenticated action, not even sign-out.
 */
export class SignOutUseCase {
  public constructor(
    private readonly sessions: AuthSessionRepository,
    private readonly audit: AuthenticationAuditRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: SignOut): Promise<Result<SignOutView, DomainError>> {
    const { sessionId } = command.payload;

    if (!isWellFormedSessionId(sessionId)) {
      return Result.fail(new AuthenticationStateRejectedError());
    }

    const id = parseSessionId(sessionId);
    const now = DateTime.now();
    const loaded = await this.sessions.get(id);

    if (loaded === undefined) {
      return this.reject({ reason: 'UNKNOWN_TOKEN' });
    }

    const session = loaded.aggregate;

    if (session.isRevoked()) {
      return this.reject(
        { reason: 'REVOKED', sessionId: session.sessionId(), userId: session.userIdValue() },
        new SessionRevokedError(),
      );
    }

    if (session.isExpired(now)) {
      return this.reject(
        { reason: 'EXPIRED', sessionId: session.sessionId(), userId: session.userIdValue() },
        new SessionExpiredError(),
      );
    }

    return this.boundary.execute<Result<SignOutView, DomainError>>(async () => {
      session.revoke(now);
      await this.sessions.update(session, loaded.revision);

      await this.audit.record(
        new AuthenticationEnded(
          { userId: session.userIdValue(), sessionId: session.sessionId() },
          causedBy(command),
        ),
      );

      return Result.ok({ sessionId: session.sessionId(), revokedAt: now.toIsoString() });
    });
  }

  /** Records a rejected sign-out and answers with the matching failure. */
  private async reject(
    data: AuthenticationStateRejectedData,
    error: DomainError = new AuthenticationStateRejectedError(),
  ): Promise<Result<SignOutView, DomainError>> {
    await this.audit.record(new AuthenticationStateRejected(data));
    return Result.fail(error);
  }
}
