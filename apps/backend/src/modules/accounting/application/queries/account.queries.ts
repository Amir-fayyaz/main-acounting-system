/**
 * Read-side inputs for the chart-of-accounts API (ACC-001.7).
 *
 * Queries are plain, immutable data — no tenant id: the scope comes from the
 * authenticated request (SHR-007; IAM-007), never from the client. The
 * presentation layer maps validated DTOs onto these.
 */

/** Filters accepted by the flat account list. */
export interface ListAccountsQuery {
  /** Free text matched against the code and the name (Persian-normalized). */
  readonly search?: string;
  /** One of the domain account types (`asset`, `liability`, …). */
  readonly type?: string;
  /** Restricts the result to active or inactive accounts. */
  readonly active?: boolean;
  /** Restricts the result to postable or grouping accounts. */
  readonly postable?: boolean;
}

/** Input for the tree read: the whole chart, or one node's subtree. */
export interface GetAccountTreeQuery {
  /** When given, the returned tree starts at this account instead of the roots. */
  readonly rootId?: string;
}
