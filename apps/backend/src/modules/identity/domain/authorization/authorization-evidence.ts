/**
 * The facts an authorization decision is made from (IAM-006; ADR-010 section 3).
 *
 * Evidence is what the application *resolved* — never what a client claimed.
 * The tenant in `targetTenantId` is the tenant the operation targets; the
 * membership is the caller's relationship to it and the permissions are the
 * capabilities that relationship currently confers. The domain compares the
 * three and decides; it performs no I/O and reads no ambient state, so a
 * decision can be reproduced from the evidence alone.
 *
 * Two properties are deliberately load-bearing:
 *
 * - **The membership is evidenced, not assumed.** A caller authenticated in the
 *   system is not thereby a member of every tenant, so membership is a fact the
 *   application had to look up; its absence (`undefined`) is what makes a
 *   cross-tenant attempt fail closed.
 * - **Permissions are already effective.** The set contains only capabilities
 *   that active assignments of active roles confer — activation is resolved
 *   *before* the decision (IAM-004), so a deactivated role or a removed
 *   assignment never reaches this layer as access.
 */
export interface AuthorizationEvidence {
  /**
   * The tenant the operation targets, when the requirement is tenant-scoped.
   * Omitted (or blank) means the caller supplied no valid tenant context.
   */
  readonly targetTenantId?: string;
  /**
   * The caller's membership in the target tenant, when one exists at all. Its
   * presence does not imply it is active — `active` states that.
   */
  readonly membership?: MembershipAuthorizationEvidence;
  /**
   * The capability keys the caller effectively holds. For a tenant-scoped
   * decision these are the permissions of `membership`; for a decision that is
   * not tenant-scoped they are the union of the caller's active memberships.
   */
  readonly permissions: ReadonlySet<string>;
}

/** The membership half of the evidence: which relationship, in which state. */
export interface MembershipAuthorizationEvidence {
  /** The stable membership identity, so a resolved context can name it. */
  readonly membershipId: string;
  /** The tenant the membership grants access to. */
  readonly tenantId: string;
  /** Whether the relationship is currently in force. */
  readonly active: boolean;
}
