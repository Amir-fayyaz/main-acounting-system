/**
 * The Identity module's authorization token (IAM-006).
 *
 * `AUTHORIZATION` is the module's *published* cross-feature contract: the
 * reusable decision boundary of {@link Authorization} is bound to it, and it is
 * what a later business module injects to enforce "requires permission:
 * purchase.create" without ever importing identity persistence, repositories or
 * the role model.
 */
export const AUTHORIZATION = 'AUTHORIZATION';
