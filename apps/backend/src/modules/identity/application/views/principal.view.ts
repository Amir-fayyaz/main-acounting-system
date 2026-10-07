/**
 * The authenticated principal (IAM-005; ADR-010 sections 2 and 7).
 *
 * This is what "the user is authenticated" resolves to, and it is deliberately
 * the *minimum* an established identity needs to carry:
 *
 * - `userId` — the stable identity. It is what later authorization and Tenant
 *   Context resolution key on (memberships are per user), so it must be here;
 * - `displayName` and `email` — the user's own attributes, so a client can
 *   render "signed in as …" without a second request. They are read from the
 *   user, never from the credential.
 *
 * What is **not** here is the point of the issue:
 *
 * - no tenant — authentication does not select or grant a tenant;
 * - no membership, role, permission or authorization decision — those are
 *   separate capabilities evaluated after authentication;
 * - no credential, hash, token or token digest — a principal may be logged,
 *   cached or embedded in a request without becoming a credential.
 *
 * The view is plain, serializable data: it holds no aggregate, so a caller
 * cannot mutate identity or lifecycle state through it.
 */
export interface AuthenticatedPrincipalView {
  /** The authenticated user's stable identity. */
  readonly userId: string;
  /** The user's current display name. */
  readonly displayName: string;
  /** The user's current primary contact email. */
  readonly email: string;
}
