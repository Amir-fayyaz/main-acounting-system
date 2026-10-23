import type { UserView } from './user.view.js';

/**
 * The result of a successful sign-up (IAM-008; FND-006).
 *
 * It is the public User shape — the same fields `CreateUser` publishes — and
 * nothing more. There is deliberately no credential field, no hash, no token
 * and no session in this shape: sign-up establishes an identity and the ability
 * to sign in, and both are visible to the caller by *trying to sign in*, not by
 * being handed authentication material they did not earn.
 *
 * A sign-up is also not an authorization decision: there is no tenant, no
 * membership, no role and no permission here, and signing in afterwards proves
 * identity only.
 */
export type SignedUpView = UserView;
