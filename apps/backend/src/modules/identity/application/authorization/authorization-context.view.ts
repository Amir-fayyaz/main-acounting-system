import type { MembershipStatusValue } from '../../domain/value-objects/membership-status.js';

/**
 * The authorization context of an operation, as the application resolved it
 * (IAM-006; ADR-010 sections 3 and 4).
 *
 * It is the answer to "who is acting, inside which tenant, with which
 * capabilities, and on what basis" — assembled from the authenticated principal
 * (IAM-005), the membership relationship (IAM-003) and the effective
 * permissions of its active roles (IAM-004). A protected operation reads *this*
 * instead of asking identity questions of its own.
 *
 * Three properties are the point:
 *
 * - **It is resolved, not claimed.** The tenant id is the one the caller's
 *   membership actually grants; a client-supplied identifier never becomes the
 *   tenant of a context (SHR-007, section 8). The permissions are the union the
 *   role model currently confers, not a list the caller sent.
 * - **It carries no secret.** The principal identity, a tenant id, a membership
 *   id, a membership status and capability keys — no credential, token, hash or
 *   digest, so the context is safe to attach to a request, log or audit record.
 * - **It is plain data.** Nothing here is an aggregate, so a consumer can read
 *   access state but cannot mutate identity, membership or role state through
 *   it.
 *
 * `tenantId` and `membershipId` are present exactly when the operation was
 * tenant-scoped and the membership resolved; a decision that was not
 * tenant-scoped (a platform capability such as `user.read`) carries neither.
 */
export interface AuthorizationContextView {
  /** The authenticated subject's stable identity. */
  readonly userId: string;
  /** The tenant the membership grants access to, when the decision was tenant-scoped. */
  readonly tenantId?: string;
  /** The membership the access is based on, when the decision was tenant-scoped. */
  readonly membershipId?: string;
  /** The state of that membership at the moment of the decision. */
  readonly membershipStatus?: MembershipStatusValue;
  /**
   * The effective capability keys behind the decision, in deterministic (sorted)
   * order. For a tenant-scoped decision these are the permissions of the named
   * membership; otherwise they are the union of the subject's active
   * memberships.
   */
  readonly permissions: readonly string[];
}
