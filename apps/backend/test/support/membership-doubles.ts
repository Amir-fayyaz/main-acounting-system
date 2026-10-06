import type { MembershipEventRecorder } from '../../src/modules/identity/application/ports/membership-event-recorder.port.js';
import {
  Membership,
  type MembershipSnapshot,
} from '../../src/modules/identity/domain/aggregates/membership.js';
import type { MembershipRepository } from '../../src/modules/identity/domain/repositories/membership.repository.js';
import type { MembershipId } from '../../src/modules/identity/domain/value-objects/membership-id.js';
import type { TenantReference } from '../../src/modules/identity/domain/value-objects/tenant-reference.js';
import type { UserId } from '../../src/modules/identity/domain/value-objects/user-id.js';
import type { TenantDirectory } from '../../src/modules/tenant/application/ports/tenant-directory.port.js';
import type { DomainEvent } from '../../src/shared/messaging/domain-event.js';
import { staleRevisionConflict } from '../../src/shared/persistence/optimistic-concurrency.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../src/shared/persistence/persistence-error.js';
import type { Loaded, WriteReceipt } from '../../src/shared/persistence/repository-ports.js';
import { Revision } from '../../src/shared/persistence/revision.js';
import { DateTime } from '../../src/shared/time/date-time.js';
import type { TransactionBoundary } from '../../src/shared/transaction/transaction-boundary.js';

/**
 * Test doubles for the identity membership feature (IAM-003).
 *
 * They implement the feature's own ports, never the Drizzle adapter, so the
 * domain and application tests run without a database while still exercising the
 * real use cases and the real shared kernel. The repository double stores
 * *snapshots* and hands back rehydrated copies, exactly like the real adapter,
 * and it enforces the same `(user, tenant)` uniqueness the table enforces, so a
 * test cannot pass by relying on a weaker in-memory rule.
 */

/** In-memory `MembershipRepository` with the shared compare-and-swap semantics. */
export class InMemoryMembershipRepository implements MembershipRepository {
  private readonly records = new Map<
    string,
    { snapshot: MembershipSnapshot; revision: Revision }
  >();

  /** Counts mutations, so a test can prove no hidden retry happened. */
  public addCalls = 0;
  public updateCalls = 0;

  /**
   * Makes the next `add` fail as a unique-key conflict without storing
   * anything, modelling a concurrent creator that won the pair between the
   * caller's existence check and its insert. Consumed by the failing call.
   */
  public conflictOnNextAdd = false;

  /** Seeds a membership without going through `add` (for read/update tests). */
  public seed(membership: Membership, revision: Revision = Revision.initial()): void {
    this.records.set(membership.id.value, { snapshot: membership.snapshot(), revision });
  }

  /** The stored revision, to assert what actually landed. */
  public revisionOf(id: MembershipId): Revision | undefined {
    return this.records.get(id.value)?.revision;
  }

  /** The stored state, or `undefined`. */
  public stored(id: MembershipId): Membership | undefined {
    const record = this.records.get(id.value);
    return record === undefined ? undefined : Membership.rehydrate(record.snapshot);
  }

  public async get(id: MembershipId): Promise<Loaded<Membership> | undefined> {
    const record = this.records.get(id.value);
    return record === undefined
      ? undefined
      : { aggregate: Membership.rehydrate(record.snapshot), revision: record.revision };
  }

  public async add(membership: Membership): Promise<WriteReceipt> {
    this.addCalls += 1;
    if (
      this.conflictOnNextAdd ||
      this.records.has(membership.id.value) ||
      (await this.existsForPair(membership.userId, membership.tenantId))
    ) {
      this.conflictOnNextAdd = false;
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'MembershipRepository.add');
    }
    this.records.set(membership.id.value, {
      snapshot: membership.snapshot(),
      revision: Revision.initial(),
    });
    return { revision: Revision.initial() };
  }

  public async update(membership: Membership, expectedRevision: Revision): Promise<WriteReceipt> {
    this.updateCalls += 1;
    const record = this.records.get(membership.id.value);

    if (record === undefined || !record.revision.equals(expectedRevision)) {
      throw staleRevisionConflict('MembershipRepository.update', expectedRevision);
    }

    const next = expectedRevision.next();
    this.records.set(membership.id.value, { snapshot: membership.snapshot(), revision: next });
    return { revision: next };
  }

  public async existsForPair(userId: UserId, tenantId: TenantReference): Promise<boolean> {
    return Array.from(this.records.values()).some(
      (record) =>
        record.snapshot.userId === userId.value && record.snapshot.tenantId === tenantId.value,
    );
  }

  public async findByUserId(userId: UserId): Promise<readonly Loaded<Membership>[]> {
    return this.loaded().filter((record) => record.aggregate.userId.value === userId.value);
  }

  public async findByTenantId(tenantId: TenantReference): Promise<readonly Loaded<Membership>[]> {
    return this.loaded().filter((record) => record.aggregate.tenantId.value === tenantId.value);
  }

  private loaded(): Loaded<Membership>[] {
    return Array.from(this.records.values()).map((record) => ({
      aggregate: Membership.rehydrate(record.snapshot),
      revision: record.revision,
    }));
  }
}

/** Records every membership domain event a use case raises, in order. */
export class RecordingMembershipEvents implements MembershipEventRecorder {
  public readonly recorded: DomainEvent<unknown>[] = [];

  public async record(event: DomainEvent<unknown>): Promise<void> {
    this.recorded.push(event);
  }
}

/**
 * A stand-in for the tenant module's published `TenantDirectory` contract.
 *
 * It answers existence from an explicit set of ids, so a test states which
 * tenants exist rather than reaching for the tenant module at all — which is
 * exactly the boundary the production code respects.
 */
export class StubTenantDirectory implements TenantDirectory {
  private readonly tenants = new Set<string>();

  public constructor(tenantIds: readonly string[] = []) {
    for (const id of tenantIds) {
      this.tenants.add(id);
    }
  }

  /** Registers a tenant as existing. */
  public grant(tenantId: string): void {
    this.tenants.add(tenantId);
  }

  public async exists(tenantId: string): Promise<boolean> {
    return this.tenants.has(tenantId);
  }
}

/** A boundary that runs work directly: enough for unit tests, no transaction. */
export class PassthroughTransactionBoundary implements TransactionBoundary {
  public executions = 0;

  public async execute<T>(work: () => Promise<T>): Promise<T> {
    this.executions += 1;
    return work();
  }
}

/** A deterministic instant for tests that must not depend on the wall clock. */
export const FIXED_NOW = DateTime.parse('2026-10-05T08:00:00.000Z');
