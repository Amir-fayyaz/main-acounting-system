/**
 * The application-level representation of a Permission (IAM-004).
 *
 * A permission is a catalog entry — a stable key and its description — not
 * tenant data and not an aggregate, so the view is simply its two values. The key
 * is the identity; the description is documentation a client can show.
 */
export interface PermissionView {
  /** The deterministic capability key, e.g. `company.read`. */
  readonly key: string;
  /** A short human-readable description of what the capability allows. */
  readonly description: string;
}
