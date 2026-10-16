import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { defer, type Observable } from 'rxjs';

import { ActorScope } from '../../../shared/actor/actor-scope.js';

/** The authenticated identity a guarded request resolved, when there is one. */
interface PrincipalCarrier {
  readonly principal?: { readonly userId?: string };
}

/**
 * Wraps handler execution in an actor scope (AUD-001) so a security-audit
 * record can attribute an action to the authenticated user without the use
 * cases or the callers ever reading the request again.
 *
 * Order matters: this interceptor runs *after* the global authorization guard
 * and reads `request.principal` — the value the guard resolved from the
 * verified token — so no handler, use case or observer can see an actor the
 * request did not earn. A request without a principal keeps no scope:
 * background jobs, policy probes and system-generated facts are then recorded
 * with no actor at all, which the audit record states as "the system acted".
 *
 * The work runs through `defer`, so the scope is established when the handler
 * is actually subscribed to (and torn down when it settles) rather than when
 * the interceptor is invoked — the same lifetime the handler observes.
 */
@Injectable()
export class ActorScopeInterceptor implements NestInterceptor {
  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<PrincipalCarrier>();
    const userId = request?.principal?.userId;

    if (userId === undefined) {
      return next.handle();
    }

    return defer(() => ActorScope.run(userId, () => next.handle()));
  }
}
