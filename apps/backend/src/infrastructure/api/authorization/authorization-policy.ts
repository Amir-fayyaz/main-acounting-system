import { SetMetadata, type CustomDecorator } from '@nestjs/common';

/**
 * How an endpoint declares what it requires (IAM-006; FND-006; ADR-010
 * sections 3 and 13).
 *
 * This is a *declaration* primitive, not a decision: it records, as metadata on
 * the operation, that the endpoint is public, requires authentication, or needs a
 * capability (within a named tenant). The Identity module's authorization
 * boundary reads it and decides — and because a decision belongs to the
 * application layer, the same requirement can be enforced for a call that never
 * became an HTTP request.
 *
 * The vocabulary lives in the shared API layer for the same reason the error
 * contract and pagination do: *every* module's controller must be able to
 * classify its own endpoints, and a module may not reach into another module's
 * presentation layer to do it. The declaration is transport-shaped; the
 * capability keys in it are the stable, shared identity vocabulary of IAM-004.
 *
 * | Declaration | Meaning |
 * | --- | --- |
 * | `@Public()` | No authentication, no authorization. Operational and reference endpoints only. |
 * | `@RequiresAuthentication()` | The caller must be authenticated; no capability is required. |
 * | `@Authorize({ permission, tenantParam? })` | The caller must be authenticated and hold the capability — within the tenant named by `tenantParam` when it is given. |
 *
 * An endpoint that declares **none** of them is denied: "nobody stated what this
 * operation requires" is answered with no access, not with access. Deny-by-default
 * is thus a property of the boundary rather than a habit of the author (ADR-010
 * section 13).
 */

/** Metadata key marking an operation as reachable without authentication. */
export const PUBLIC_ENDPOINT_METADATA = 'AUTHORIZATION_PUBLIC';

/** Metadata key marking an operation as requiring authentication only. */
export const AUTHENTICATED_ENDPOINT_METADATA = 'AUTHORIZATION_AUTHENTICATED';

/** Metadata key carrying the capability policy of an operation. */
export const AUTHORIZATION_POLICY_METADATA = 'AUTHORIZATION_POLICY';

/** What a protected operation requires of its caller. */
export interface AuthorizationPolicy {
  /** The stable capability key from the IAM-004 catalog (e.g. `role.manage`). */
  readonly permission: string;
  /**
   * The route parameter naming the tenant the operation targets, when the
   * requirement is tenant-scoped (e.g. `tenantId`). Omitting it declares a
   * platform capability that no single tenant owns.
   *
   * The parameter is only the *claim*: the authorization boundary verifies it
   * against the caller's membership before the operation runs, so naming a
   * tenant here never grants one.
   */
  readonly tenantParam?: string;
}

/** Declares an operation reachable without authentication or authorization. */
export const Public = (): CustomDecorator => SetMetadata(PUBLIC_ENDPOINT_METADATA, true);

/**
 * Declares an operation that requires an authenticated caller but no specific
 * capability — reading one's own session, signing out.
 */
export const RequiresAuthentication = (): CustomDecorator =>
  SetMetadata(AUTHENTICATED_ENDPOINT_METADATA, true);

/**
 * Declares the capability (and, where given, the target tenant) an operation
 * requires. Apply it to the handler; apply `@ApiBearerAuth()` on the class so
 * the OpenAPI document states the requirement too.
 */
export const Authorize = (policy: AuthorizationPolicy): CustomDecorator =>
  SetMetadata(AUTHORIZATION_POLICY_METADATA, policy);
