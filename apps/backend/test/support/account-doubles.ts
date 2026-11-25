import type { AccountTemplateApplication } from '../../src/modules/accounting/domain/repositories/account-template.repository.js';
import type { AccountTemplateApplicationRepository } from '../../src/modules/accounting/domain/repositories/account-template.repository.js';
import type {
  AccountRepository,
  AccountTreeNode,
} from '../../src/modules/accounting/domain/repositories/account.repository.js';
import type {
  AccountRoleMapping,
  AccountRoleRepository,
} from '../../src/modules/accounting/domain/repositories/account-role.repository.js';
import {
  Account,
  type AccountSnapshot,
} from '../../src/modules/accounting/domain/aggregates/account.js';
import type { AccountRole } from '../../src/modules/accounting/domain/value-objects/account-role.js';
import type { TenantReference } from '../../src/modules/accounting/domain/value-objects/tenant-reference.js';
import type { AccountId } from '../../src/modules/accounting/domain/value-objects/account-id.js';
import { staleRevisionConflict } from '../../src/shared/persistence/optimistic-concurrency.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../src/shared/persistence/persistence-error.js';
import type { Loaded, WriteReceipt } from '../../src/shared/persistence/repository-ports.js';
import { Revision } from '../../src/shared/persistence/revision.js';

/**
 * Test doubles for the chart-of-accounts API (ACC-001.7).
 *
 * They implement the module's own ports and store snapshots, handing back
 * rehydrated copies exactly like the Drizzle adapter, so the API suite exercises
 * the real controllers, use cases and shared filters without a database. Like
 * the other module doubles they do *not* enforce the ambient tenant scope: that
 * is the adapter's job and is proven by `account-persistence.e2e-spec.ts`. The
 * application layer's own tenant comparison is still exercised, because the
 * doubles return whatever is stored.
 */
export class InMemoryAccountRepository implements AccountRepository {
  private readonly records = new Map<string, { snapshot: AccountSnapshot; revision: Revision }>();

  /** Seeds an account without going through `add` (for read/decline tests). */
  public seed(account: Account, revision: Revision = Revision.initial()): void {
    this.records.set(account.id.value, { snapshot: account.snapshot(), revision });
  }

  /** The stored state, or `undefined`. */
  public stored(id: AccountId): Account | undefined {
    const record = this.records.get(id.value);
    return record === undefined ? undefined : Account.rehydrate(record.snapshot);
  }

  /** The stored revision, to assert what actually landed. */
  public revisionOf(id: AccountId): Revision | undefined {
    return this.records.get(id.value)?.revision;
  }

  public async get(id: AccountId): Promise<Loaded<Account> | undefined> {
    const record = this.records.get(id.value);
    return record === undefined
      ? undefined
      : { aggregate: Account.rehydrate(record.snapshot), revision: record.revision };
  }

  public async findByTenant(tenantId: TenantReference): Promise<readonly Loaded<Account>[]> {
    return [...this.records.values()]
      .filter((record) => record.snapshot.tenantId === tenantId.value)
      .sort((a, b) => a.snapshot.code.localeCompare(b.snapshot.code))
      .map((record) => ({
        aggregate: Account.rehydrate(record.snapshot),
        revision: record.revision,
      }));
  }

  public async loadTree(tenantId: TenantReference): Promise<readonly AccountTreeNode[]> {
    const loaded = await this.findByTenant(tenantId);
    const nodes = new Map<string, MutableNode>();

    for (const entry of loaded) {
      nodes.set(entry.aggregate.id.value, {
        account: entry.aggregate,
        revision: entry.revision,
        children: [],
      });
    }

    const roots: MutableNode[] = [];
    for (const entry of loaded) {
      const node = nodes.get(entry.aggregate.id.value);
      if (node === undefined) {
        continue;
      }

      if (entry.aggregate.parentId === null) {
        roots.push(node);
        continue;
      }

      nodes.get(entry.aggregate.parentId)?.children.push(node);
    }

    return roots.map(freezeNode);
  }

  public async add(account: Account): Promise<WriteReceipt> {
    if (this.records.has(account.id.value)) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'AccountRepository.add');
    }

    this.records.set(account.id.value, {
      snapshot: account.snapshot(),
      revision: Revision.initial(),
    });

    return { revision: Revision.initial() };
  }

  public async update(account: Account, expectedRevision: Revision): Promise<WriteReceipt> {
    const record = this.records.get(account.id.value);
    if (record === undefined || !record.revision.equals(expectedRevision)) {
      throw staleRevisionConflict('AccountRepository.update', expectedRevision);
    }

    const next = expectedRevision.next();
    this.records.set(account.id.value, { snapshot: account.snapshot(), revision: next });

    return { revision: next };
  }

  public async delete(account: Account): Promise<void> {
    this.records.delete(account.id.value);
  }
}

interface MutableNode {
  readonly account: Account;
  readonly revision: Revision;
  readonly children: MutableNode[];
}

function freezeNode(node: MutableNode): AccountTreeNode {
  return {
    account: node.account,
    revision: node.revision,
    children: node.children.map(freezeNode),
  };
}

/** In-memory one-account-per-role mapping. */
export class InMemoryAccountRoleRepository implements AccountRoleRepository {
  private readonly mappings = new Map<string, AccountRoleMapping>();

  private key(tenantId: string, role: AccountRole): string {
    return `${tenantId}:${role}`;
  }

  public async findByRole(
    tenantId: string,
    role: AccountRole,
  ): Promise<AccountRoleMapping | undefined> {
    return this.mappings.get(this.key(tenantId, role));
  }

  public async findByAccount(
    tenantId: string,
    accountId: string,
  ): Promise<readonly AccountRoleMapping[]> {
    return [...this.mappings.values()].filter(
      (mapping) => mapping.tenantId === tenantId && mapping.accountId === accountId,
    );
  }

  public async findAll(tenantId: string): Promise<readonly AccountRoleMapping[]> {
    return [...this.mappings.values()].filter((mapping) => mapping.tenantId === tenantId);
  }

  public async save(mapping: AccountRoleMapping): Promise<void> {
    this.mappings.set(this.key(mapping.tenantId, mapping.role), mapping);
  }

  public async remove(tenantId: string, role: AccountRole): Promise<void> {
    this.mappings.delete(this.key(tenantId, role));
  }
}

/** In-memory record of which template version each company activated. */
export class InMemoryAccountTemplateApplicationRepository
  implements AccountTemplateApplicationRepository
{
  private readonly applied = new Set<string>();

  public async hasApplied(tenantId: string, templateVersion: string): Promise<boolean> {
    return this.applied.has(`${tenantId}:${templateVersion}`);
  }

  public async markApplied(application: AccountTemplateApplication): Promise<void> {
    this.applied.add(`${application.tenantId}:${application.templateVersion}`);
  }
}
