import type { User } from '../../domain/aggregates/user.js';
import type { AuthenticatedPrincipalView } from './principal.view.js';

/**
 * Maps an authenticated user to the principal view (IAM-005).
 *
 * The mapping reads *identity* attributes only — the id, the current display
 * name and the current email — and nothing from the credential that was just
 * verified. That is what keeps a principal free of secret material: there is no
 * field here that a password, a hash or a token could be passed into, and no
 * tenant, role or permission is read because a User does not have any.
 *
 * The values are the user's *current* ones, so a principal always describes the
 * person as they are now rather than as they were when they signed in.
 */
export function toPrincipalView(user: User): AuthenticatedPrincipalView {
  return {
    userId: user.id.value,
    displayName: user.displayName.value,
    email: user.email.value,
  };
}
