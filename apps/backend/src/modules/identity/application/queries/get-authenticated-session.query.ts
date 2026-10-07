import { Query } from '../../../../shared/messaging/query.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/**
 * The authentication state a request presents (IAM-005).
 *
 * `token` is optional on purpose: "no `Authorization` header", "a scheme other
 * than `Bearer`" and "an empty value" all arrive here as `undefined`, so the
 * *reason* a request is unauthenticated is decided and audited in one place
 * instead of in each transport primitive.
 */
export interface GetAuthenticatedSessionParams {
  readonly token?: string | undefined;
}

/**
 * The request to resolve the authenticated principal from a token (IAM-005;
 * SHR-003).
 *
 * This is a read, and it is the operation every protected request will run: it
 * validates the authentication state — known, unexpired, not invalidated, and
 * belonging to a user who may authenticate — and answers with the principal. It
 * changes nothing except the audit trail, which is exactly why it is a query and
 * not a command: validation must not be able to alter the state it is judging.
 *
 * The raw token is in the parameters because the adapter needs the original to
 * compute its digest; it is never stored, and the resolved view never carries it
 * back.
 */
export class GetAuthenticatedSession extends Query<GetAuthenticatedSessionParams> {
  public constructor(params: GetAuthenticatedSessionParams, options?: MessageOptions) {
    super('GetAuthenticatedSession', params, options);
  }
}
