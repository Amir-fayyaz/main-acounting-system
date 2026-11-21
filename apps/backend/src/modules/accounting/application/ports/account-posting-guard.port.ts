import type { AccountId } from '../../domain/value-objects/account-id.js';

/**
 * The single contract other modules use to ask whether an account can receive
 * postings (ACC-001.6).
 *
 * Journal posting, Purchase and the Agent plan import this port — and only
 * this port — through the accounting module's public entry point. They never
 * load an account, inspect its flags or re-implement the validity rules; that
 * keeps one answer to "may this account be posted to?" and gives every caller
 * the same stable failure codes.
 *
 * The account is always resolved in the **current tenant scope** (`SHR-007`):
 * there is no tenant parameter to pass and no way to name another company. An
 * account that does not exist and one that belongs to another tenant are
 * deliberately indistinguishable — both fail with `ACCOUNT_NOT_FOUND`, so the
 * guard never confirms the existence of another company's data.
 *
 * Checks, in order:
 *
 * 1. the account exists in the current tenant (`ACCOUNT_NOT_FOUND`);
 * 2. it is active (`ACCOUNT_INACTIVE`);
 * 3. it is a leaf explicitly marked postable (`ACCOUNT_NOT_POSTABLE`).
 *
 * Callers should invoke the guard inside the same transaction boundary that
 * writes the financial fact, so an account deactivated concurrently cannot slip
 * a posting in between the check and the write.
 */
export interface AccountPostingGuard {
  /**
   * Asserts that `accountId` may receive postings for the current tenant.
   *
   * @throws AccountNotFoundError — the account does not exist in the current
   * tenant (including when the id belongs to another tenant).
   * @throws AccountInactiveError — the account is deactivated.
   * @throws AccountNotPostableError — the account is a grouping node.
   */
  assertPostable(accountId: AccountId): Promise<void>;

  /**
   * Asserts that every given account may receive postings.
   *
   * Reports **all** failures in a single `AccountPostingRejectedError`, with one
   * detail per failing account, so a batch caller can present the complete list
   * instead of fixing one account per round trip. Duplicate ids are checked
   * once. An empty list is accepted.
   *
   * @throws AccountPostingRejectedError — at least one account failed; its
   * details carry each failure's stable code.
   */
  assertAllPostable(accountIds: readonly AccountId[]): Promise<void>;
}
