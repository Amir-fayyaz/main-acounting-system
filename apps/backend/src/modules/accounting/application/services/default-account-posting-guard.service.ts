import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import type { Account } from '../../domain/aggregates/account.js';
import {
  AccountInactiveError,
  AccountNotFoundError,
  AccountNotPostableError,
  AccountPostingRejectedError,
} from '../../domain/errors/account.errors.js';
import type { AccountRepository } from '../../domain/repositories/account.repository.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import type { AccountId } from '../../domain/value-objects/account-id.js';
import type { AccountPostingGuard } from '../ports/account-posting-guard.port.js';

/**
 * The default implementation of {@link AccountPostingGuard} (ACC-001.6).
 *
 * It is a thin, single-purpose read over the account repository: resolve the
 * account in the ambient tenant, then apply the three checks in a fixed order.
 * It deliberately owns no state, opens no transaction (the caller supplies the
 * boundary), writes nothing and raises no event — a guard answers a question.
 *
 * Tenant safety comes from two independent layers:
 *
 * - every repository read is scoped by the ambient tenant, so a foreign account
 *   is simply absent;
 * - the resolved aggregate's `tenantId` is compared with the scope as well, so
 *   an adapter or test double that is not tenant-aware still cannot make the
 *   guard accept another company's account.
 *
 * Both layers collapse "foreign account" into "not found", which is the point:
 * the guard must not disclose that another tenant's account exists.
 */
export class DefaultAccountPostingGuard implements AccountPostingGuard {
  public constructor(private readonly accounts: AccountRepository) {}

  public async assertPostable(accountId: AccountId): Promise<void> {
    const tenantId = TenantScope.requireTenantId();
    const loaded = await this.accounts.get(accountId);

    const failure = postingFailure(tenantId, accountId.value, loaded?.aggregate);

    if (failure !== undefined) {
      throw failure;
    }
  }

  public async assertAllPostable(accountIds: readonly AccountId[]): Promise<void> {
    const tenantId = TenantScope.requireTenantId();
    const ids = uniqueIds(accountIds);

    if (ids.length === 0) {
      return;
    }

    // One read for the whole batch, then a per-id decision: a batch of lines
    // costs one query, not one per account, and the result is still judged
    // against the same rules the single-account form applies.
    const loaded = await this.accounts.findByTenant(tenantReferenceFrom(tenantId));
    const byId = new Map(loaded.map((entry) => [entry.aggregate.id.value, entry.aggregate]));

    const failures = ids
      .map((accountId) => postingFailure(tenantId, accountId.value, byId.get(accountId.value)))
      .filter((failure): failure is DomainError => failure !== undefined);

    if (failures.length > 0) {
      throw new AccountPostingRejectedError(failures);
    }
  }
}

/**
 * The whole rule for one account: absent (or foreign), inactive, not postable,
 * or `undefined` when it may receive postings.
 *
 * The order is part of the contract: existence is decided before lifecycle, and
 * lifecycle before postability, so a caller gets the most fundamental reason
 * first and a foreign id can never be distinguished from a missing one.
 */
function postingFailure(
  tenantId: string,
  accountId: string,
  account: Account | undefined,
): DomainError | undefined {
  if (account === undefined || account.tenantId !== tenantId) {
    return new AccountNotFoundError(accountId);
  }

  if (!account.active) {
    return new AccountInactiveError(accountId);
  }

  if (!account.postable) {
    return new AccountNotPostableError(accountId);
  }

  return undefined;
}

/** Keeps first-seen order while checking an id only once. */
function uniqueIds(accountIds: readonly AccountId[]): AccountId[] {
  const seen = new Set<string>();
  const unique: AccountId[] = [];

  for (const accountId of accountIds) {
    if (seen.has(accountId.value)) {
      continue;
    }
    seen.add(accountId.value);
    unique.push(accountId);
  }

  return unique;
}
