import { NotFoundError } from '../../../../shared/errors/category-errors.js';
import { resolveScopedTenant } from './tenant-scope.js';

/**
 * Resolves the tenant a membership operation is allowed to act on (IAM-003).
 *
 * Membership data belongs to exactly one tenant, so every tenant-scoped
 * membership operation reads the tenant from the ambient tenant scope and checks
 * the requested tenant against it. The rule lives once, in
 * {@link resolveScopedTenant}, and this alias keeps the membership call sites
 * reading in their own vocabulary.
 */
export const resolveMembershipTenant = resolveScopedTenant;

/** The one not-found failure a membership lookup reports inside a tenant. */
export function membershipNotFound(): NotFoundError {
  return new NotFoundError('The membership was not found.');
}
