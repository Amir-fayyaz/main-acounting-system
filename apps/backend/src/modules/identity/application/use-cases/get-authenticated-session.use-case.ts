import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import {
  AccountNotAuthenticatableError,
  AuthenticationRequiredError,
  AuthenticationStateRejectedError,
  SessionExpiredError,
  SessionRevokedError,
} from '../../domain/errors/authentication.errors.js';
import {
  AuthenticationStateRejected,
  type AuthenticationStateRejectedData,
} from '../../domain/events/authentication.events.js';
import type { AuthSessionRepository } from '../../domain/repositories/auth-session.repository.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import type { GetAuthenticatedSession } from '../queries/get-authenticated-session.query.js';
import type { AuthenticationAuditRecorder } from '../ports/authentication-audit-recorder.port.js';
import type { SessionTokenService } from '../ports/session-token-service.port.js';
import { toPrincipalView } from '../views/principal.mapper.js';
import type { AuthenticatedSessionView } from '../views/authenticated-session.view.js';

/**
 * Resolves, and validates, the authentication state a request presents
 * (IAM-005; ADR-010 sections 2, 11 and 13).
 *
 * This is the operation the authentication boundary runs before any protected
 * endpoint's logic, and it is the place where "is this request authenticated?"
 * is answered — once, for every mechanism user:
 *
 * ```text
 * token → digest → session?         no  → rejected
 *                → revoked?         yes → rejected
 *                → expired?         yes → rejected
 *                → user exists?     no  → rejected
 *                → user active?     no  → rejected
 *                → principal
 * ```
 *
 * Three properties are load-bearing:
 *
 * - **Fail closed.** Every branch above that is not a definite "yes" answers
 *   with a failure; there is no default-allow path and no branch that treats an
 *   unknown state as valid (ADR-010 section 13).
 * - **Lifecycle is re-checked at every use.** A session says a user *was*
 *   authenticated; whether they may still authenticate is a property of the user
 *   now. Deactivating a user therefore stops their existing sessions from being
 *   accepted, without the user feature having to know that sessions exist.
 * - **It grants nothing.** The result is a principal — identity only. No tenant
 *   scope is established and no role or permission is read: authentication
 *   answers *who*, and access to a tenant stays a separate decision
 *   (ADR-010 section 4).
 *
 * The only write this query performs is an audit record, and only for a
 * rejection: validating a request must not change the state it judges, while a
 * refused authentication is exactly the kind of event the security model
 * requires to be recorded (ADR-010 section 9).
 */
export class GetAuthenticatedSessionUseCase {
  public constructor(
    private readonly users: UserRepository,
    private readonly sessions: AuthSessionRepository,
    private readonly tokens: SessionTokenService,
    private readonly audit: AuthenticationAuditRecorder,
  ) {}

  public async execute(
    query: GetAuthenticatedSession,
  ): Promise<Result<AuthenticatedSessionView, DomainError>> {
    const token = query.params.token;

    if (typeof token !== 'string' || token.trim() === '') {
      await this.audit.record(new AuthenticationStateRejected({ reason: 'MISSING_TOKEN' }));
      return Result.fail(new AuthenticationRequiredError());
    }

    const loaded = await this.sessions.findByTokenHash(this.tokens.hash(token));

    if (loaded === undefined) {
      await this.audit.record(new AuthenticationStateRejected({ reason: 'UNKNOWN_TOKEN' }));
      return Result.fail(new AuthenticationStateRejectedError());
    }

    const session = loaded.aggregate;
    const now = DateTime.now();

    if (session.isRevoked()) {
      await this.record({
        reason: 'REVOKED',
        sessionId: session.sessionId(),
        userId: session.userIdValue(),
      });
      return Result.fail(new SessionRevokedError());
    }

    if (session.isExpired(now)) {
      await this.record({
        reason: 'EXPIRED',
        sessionId: session.sessionId(),
        userId: session.userIdValue(),
      });
      return Result.fail(new SessionExpiredError());
    }

    const found = await this.users.get(session.userId);

    if (found === undefined) {
      await this.record({ reason: 'USER_MISSING', sessionId: session.sessionId() });
      return Result.fail(new AuthenticationStateRejectedError());
    }

    const user = found.aggregate;

    if (!user.isActive()) {
      await this.record({
        reason: 'USER_NOT_AUTHENTICATABLE',
        sessionId: session.sessionId(),
        userId: user.userId(),
      });
      return Result.fail(new AccountNotAuthenticatableError());
    }

    return Result.ok({
      sessionId: session.sessionId(),
      expiresAt: session.expiresAt.toIsoString(),
      principal: toPrincipalView(user),
    });
  }

  /** Records one rejected authentication state, with whatever was resolved about it. */
  private async record(data: AuthenticationStateRejectedData): Promise<void> {
    await this.audit.record(new AuthenticationStateRejected(data));
  }
}
