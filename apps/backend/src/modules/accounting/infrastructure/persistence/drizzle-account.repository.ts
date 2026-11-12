import { and, asc, eq } from 'drizzle-orm';

import type { EntityId } from '../../../../shared/id/entity-id.js';
import type { Database } from '../../../../infrastructure/database/database.module.js';
import { scopedDatabase } from '../../../../infrastructure/database/scoped-database.js';
import {
  assertTenantCriterion,
  assertTenantOwnership,
  tenantEq,
} from '../../../../infrastructure/database/tenant-scoped.js';
import { staleRevisionConflict } from '../../../../shared/persistence/optimistic-concurrency.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../../../shared/persistence/persistence-error.js';
import type { Loaded, WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import type { Account } from '../../domain/aggregates/account.js';
import type {
  AccountRepository,
  AccountTreeNode,
} from '../../domain/repositories/account.repository.js';
import type { TenantReference } from '../../domain/value-objects/tenant-reference.js';
import {
  type AccountRow,
  toAccount,
  toAccountRow,
  toAccountUpdateValues,
} from './account.mapper.js';
import { accounts } from './account.schema.js';

/**
 * Drizzle/MySQL implementation of the account persistence port (ACC-001.2;
 * SHR-004, SHR-008; IAM-007).
 *
 * Three properties make this adapter correct rather than merely convenient:
 *
 * - **Every statement goes through `scopedDatabase`.** Inside a use case's
 *   transaction the write joins that boundary and commits with it; outside one
 *   it is a single autocommitted statement. The adapter never opens a
 *   transaction of its own (SHR-005).
 * - **`update` is one compare-and-swap.** The revision check and the write are
 *   the same statement, so no other transaction can land between them; zero
 *   affected rows means the row moved, and that is reported through
 *   `staleRevisionConflict` — the shared SHR-008 failure — instead of
 *   overwriting the winner.
 * - **The tenant boundary is enforced here, not only in the application.** A
 *   read by id carries the ambient scope in its `WHERE`, a criterion read is
 *   compared with the scope before the statement, and every write re-checks
 *   ownership immediately before it runs, so one company can never read or store
 *   another's accounts (IAM-007; doc 26).
 *
 * `loadTree` is the one non-trivial read: it reads the tenant's chart in a
 * single query and assembles the hierarchy in memory, so depth costs nothing in
 * round trips (no N+1). The assembly is order-independent and validates its own
 * result — stored rows that do not hang off a root (a cycle, which the domain
 * forbids but the foreign key cannot) fail loudly instead of disappearing from
 * the tree.
 *
 * Driver vocabulary stops here: a duplicate code and a refused constraint are
 * translated into the shared `PersistenceError` vocabulary, so no SQL state or
 * message text leaks past this file.
 */
export class DrizzleAccountRepository implements AccountRepository {
  public constructor(private readonly database: Database) {}

  public async get(id: EntityId): Promise<Loaded<Account> | undefined> {
    // Scoped by the ambient tenant as well as the identity: another tenant's
    // account is simply not there to be read (IAM-007).
    const rows = await scopedDatabase(this.database)
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id.value), tenantEq(accounts.tenantId)))
      .limit(1);

    const row = rows[0];
    return row === undefined
      ? undefined
      : { aggregate: toAccount(row), revision: Revision.of(row.revision) };
  }

  public async findByTenant(tenantId: TenantReference): Promise<readonly Loaded<Account>[]> {
    // The criterion must be the active tenant: a caller cannot widen the read
    // to another company, and with no scope at all it fails closed.
    assertTenantCriterion(tenantId.value, 'AccountRepository.findByTenant');

    const rows = await scopedDatabase(this.database)
      .select()
      .from(accounts)
      .where(eq(accounts.tenantId, tenantId.value))
      .orderBy(asc(accounts.code));

    return rows.map((row) => ({
      aggregate: toAccount(row),
      revision: Revision.of(row.revision),
    }));
  }

  public async loadTree(tenantId: TenantReference): Promise<readonly AccountTreeNode[]> {
    // One query for the whole chart; ordered by depth then code so the rows
    // arrive in a hierarchy-friendly order even though the assembly below does
    // not depend on it.
    assertTenantCriterion(tenantId.value, 'AccountRepository.loadTree');

    const rows = await scopedDatabase(this.database)
      .select()
      .from(accounts)
      .where(eq(accounts.tenantId, tenantId.value))
      .orderBy(asc(accounts.level), asc(accounts.code));

    return assembleTree(rows);
  }

  public async add(account: Account): Promise<WriteReceipt> {
    assertTenantOwnership(account.tenantId, 'AccountRepository.add');

    try {
      await scopedDatabase(this.database)
        .insert(accounts)
        .values(toAccountRow(account, Revision.initial()));
    } catch (error) {
      throw translateWriteFailure(error, 'AccountRepository.add') ?? error;
    }

    return { revision: Revision.initial() };
  }

  public async update(account: Account, expectedRevision: Revision): Promise<WriteReceipt> {
    assertTenantOwnership(account.tenantId, 'AccountRepository.update');

    let header;
    try {
      [header] = await scopedDatabase(this.database)
        .update(accounts)
        .set(toAccountUpdateValues(account, expectedRevision.next()))
        .where(
          and(
            eq(accounts.id, account.id.value),
            eq(accounts.revision, expectedRevision.value),
            tenantEq(accounts.tenantId),
          ),
        );
    } catch (error) {
      throw translateWriteFailure(error, 'AccountRepository.update') ?? error;
    }

    if (header.affectedRows === 0) {
      // The store answers "nothing matched" without naming what is stored
      // instead, so the cause stays honest about the unknown current revision.
      throw staleRevisionConflict('AccountRepository.update', expectedRevision);
    }

    return { revision: expectedRevision.next() };
  }

  public async delete(account: Account): Promise<void> {
    assertTenantOwnership(account.tenantId, 'AccountRepository.delete');

    await scopedDatabase(this.database)
      .delete(accounts)
      .where(and(eq(accounts.id, account.id.value), tenantEq(accounts.tenantId)));
  }
}

/**
 * Builds the chart of accounts from the rows of **one** query.
 *
 * Two passes — index every id, then attach each node to its parent — so the
 * result never depends on the rows' order. After attaching, every node must be
 * reachable from a root: a row that is part of a cycle (possible in storage, not
 * in the domain) is data corruption, and is reported rather than silently
 * dropped from the tree.
 *
 * @throws PersistenceError — the stored hierarchy is not a forest.
 */
function assembleTree(rows: readonly AccountRow[]): readonly AccountTreeNode[] {
  const nodes = new Map<string, MutableNode>();
  for (const row of rows) {
    nodes.set(row.id, {
      account: toAccount(row),
      revision: Revision.of(row.revision),
      children: [],
    });
  }

  const roots: MutableNode[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id);
    if (node === undefined) {
      continue;
    }

    if (row.parentId === null) {
      roots.push(node);
      continue;
    }

    const parent = nodes.get(row.parentId);
    if (parent === undefined) {
      // The composite parent foreign key makes this unreachable for rows this
      // tenant owns; refusing keeps the invariant visible if it is ever broken.
      throw inconsistentHierarchy('a parent row is missing from the chart');
    }

    parent.children.push(node);
  }

  if (reachableCount(roots) !== rows.length) {
    throw inconsistentHierarchy('a stored account is not reachable from a root');
  }

  return roots.map(freezeNode);
}

/** Mutable assembly shape; converted to the immutable port type before return. */
interface MutableNode {
  readonly account: Account;
  readonly revision: Revision;
  readonly children: MutableNode[];
}

/** Counts the nodes reachable from the roots, guarding against cycles. */
function reachableCount(roots: readonly MutableNode[]): number {
  const visited = new Set<string>();
  const stack = [...roots];

  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) {
      continue;
    }

    const id = node.account.id.value;
    if (visited.has(id)) {
      continue;
    }
    visited.add(id);
    stack.push(...node.children);
  }

  return visited.size;
}

/** Converts one assembled node and its descendants to the immutable port type. */
function freezeNode(node: MutableNode): AccountTreeNode {
  return {
    account: node.account,
    revision: node.revision,
    children: node.children.map(freezeNode),
  };
}

/** The failure a stored hierarchy that is not a forest raises. */
function inconsistentHierarchy(reason: string): PersistenceError {
  return new PersistenceError(PersistenceFailureKind.REJECTED, 'AccountRepository.loadTree', {
    cause: new Error(`The stored chart of accounts is inconsistent: ${reason}.`),
  });
}

/**
 * Translates the refusals the database can issue for an account write, or
 * returns `undefined` for anything this adapter cannot classify — which then
 * propagates untouched rather than being guessed at.
 *
 * - a duplicate key (`ER_DUP_ENTRY`) → `CONFLICT`: either the identity is
 *   taken or the account code already exists in this company, which is the
 *   database half of the `UNIQUE (tenant_id, code)` rule;
 * - a refused constraint (`ER_CHECK_CONSTRAINT_VIOLATED`) → `REJECTED`: the
 *   level/parent shape was refused, nothing was applied;
 * - a missing parent (`ER_NO_REFERENCED_ROW_2`) → `REJECTED`: the parent id is
 *   not an account of this tenant. The composite foreign key includes the
 *   tenant, so a parent from another company lands here too — a defence against
 *   a write that bypassed the domain, not a path the use case expects.
 */
function translateWriteFailure(error: unknown, operation: string): PersistenceError | undefined {
  if (isDriverError(error, 'ER_DUP_ENTRY')) {
    return new PersistenceError(PersistenceFailureKind.CONFLICT, operation, { cause: error });
  }
  if (
    isDriverError(error, 'ER_CHECK_CONSTRAINT_VIOLATED') ||
    isDriverError(error, 'ER_NO_REFERENCED_ROW_2')
  ) {
    return new PersistenceError(PersistenceFailureKind.REJECTED, operation, { cause: error });
  }
  return undefined;
}

/**
 * Whether the driver reported `code`, looking through the wrappers Drizzle adds.
 *
 * Drizzle raises its own `DrizzleQueryError` and keeps the MySQL failure on the
 * wrapped cause, so the chain is walked instead of reading only the outermost
 * error — otherwise a duplicate code or a refused foreign key would escape as an
 * unexpected 500 rather than the classified failure the boundary can act on.
 */
function isDriverError(error: unknown, code: string): boolean {
  let current: unknown = error;

  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth += 1) {
    if ((current as { readonly code?: unknown }).code === code) {
      return true;
    }
    current = (current as { readonly cause?: unknown }).cause;
  }

  return false;
}
