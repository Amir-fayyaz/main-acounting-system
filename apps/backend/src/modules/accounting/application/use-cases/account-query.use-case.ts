import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { matchesPersianSearch } from '../../../../shared/text/persian-search.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';

import { AccountNotFoundError } from '../../domain/errors/account.errors.js';
import type { AccountRepository, AccountTreeNode } from '../../domain/repositories/account.repository.js';
import { isAccountId } from '../../domain/value-objects/account-id.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import { ACCOUNT_ROLES } from '../../domain/value-objects/account-role.js';
import type { AccountRoleRepository } from '../../domain/repositories/account-role.repository.js';

import type { GetAccountTreeQuery, ListAccountsQuery } from '../queries/account.queries.js';
import { toAccountView, type AccountView } from '../views/account.view.js';
import type {
  AccountRoleAssignmentView,
  AccountTreeNodeView,
  AccountTreeView,
} from '../views/account-tree.view.js';

/**
 * The flat account list behind `GET /accounts` (ACC-001.7).
 *
 * One tenant-scoped read, then in-memory filtering: a chart is a small,
 * bounded reference set (the standard template is a few dozen rows), so a
 * second query per filter would add no correctness and cost a round trip.
 * The search is Persian-normalized on both sides (yeh/kaf variants, Persian
 * and Arabic-Indic digits, ZWNJ), and matches the code *or* the name.
 *
 * The repository already returns code order; the filtered list keeps it.
 */
export class ListAccountsUseCase {
  public constructor(private readonly accounts: AccountRepository) {}

  public async execute(
    query: ListAccountsQuery,
  ): Promise<Result<readonly AccountView[], DomainError>> {
    const tenantId = TenantScope.requireTenantId();
    const rows = await this.accounts.findByTenant(tenantReferenceFrom(tenantId));
    const type = query.type?.toLowerCase();

    const views = rows
      .filter(({ aggregate }) => {
        if (type !== undefined && aggregate.type.value !== type) {
          return false;
        }
        if (query.active !== undefined && aggregate.active !== query.active) {
          return false;
        }
        if (query.postable !== undefined && aggregate.postable !== query.postable) {
          return false;
        }
        if (query.search !== undefined) {
          const searchable = `${aggregate.code.value} ${aggregate.name}`;
          if (!matchesPersianSearch(searchable, query.search)) {
            return false;
          }
        }

        return true;
      })
      .map(({ aggregate, revision }) => toAccountView(aggregate, revision.value));

    return Result.ok(views);
  }
}

/**
 * The chart as a tree behind `GET /accounts/tree` (ACC-001.7).
 *
 * Without a `rootId` the response is the whole forest; with one it is that
 * account's subtree, so a client can lazily expand a large chart from any
 * level. A root that does not exist in the current tenant — including an id
 * that belongs to another company — is answered exactly like a missing account
 * (`ACCOUNT_NOT_FOUND`), never confirming the foreign record.
 *
 * The tree is loaded in one query by the repository and only projected here,
 * so the read has no N+1 walk regardless of depth.
 */
export class GetAccountTreeUseCase {
  public constructor(private readonly accounts: AccountRepository) {}

  public async execute(
    query: GetAccountTreeQuery,
  ): Promise<Result<AccountTreeView, DomainError>> {
    const tenantId = TenantScope.requireTenantId();
    const tree = await this.accounts.loadTree(tenantReferenceFrom(tenantId));

    if (query.rootId === undefined) {
      return Result.ok({ roots: tree.map(toNodeView) });
    }

    if (!isAccountId(query.rootId)) {
      return Result.fail(new AccountNotFoundError(query.rootId));
    }

    const root = findNode(tree, query.rootId);
    if (root === undefined) {
      return Result.fail(new AccountNotFoundError(query.rootId));
    }

    return Result.ok({ roots: [toNodeView(root)] });
  }
}

/**
 * The role mapping behind `GET /account-roles` (ACC-001.7).
 *
 * Every role the purchase flow needs is listed, mapped or not, so the client
 * can render the whole mapping in one response and see at a glance what is
 * still missing.
 */
export class ListAccountRoleMappingsUseCase {
  public constructor(private readonly roles: AccountRoleRepository) {}

  public async execute(): Promise<Result<readonly AccountRoleAssignmentView[], DomainError>> {
    const tenantId = TenantScope.requireTenantId();
    const mappings = await this.roles.findAll(tenantId);

    const views = ACCOUNT_ROLES.map((role): AccountRoleAssignmentView => {
      const mapping = mappings.find((item) => item.role === role);

      return {
        role,
        accountId: mapping?.accountId ?? null,
        updatedAt: mapping?.updatedAt.toISOString() ?? null,
      };
    });

    return Result.ok(views);
  }
}

function toNodeView(node: AccountTreeNode): AccountTreeNodeView {
  return {
    ...toAccountView(node.account, node.revision.value),
    children: node.children.map(toNodeView),
  };
}

function findNode(
  nodes: readonly AccountTreeNode[],
  accountId: string,
): AccountTreeNode | undefined {
  for (const node of nodes) {
    if (node.account.id.value === accountId) {
      return node;
    }

    const found = findNode(node.children, accountId);
    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}
