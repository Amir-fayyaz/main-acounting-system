import type { TenantEventRecorder } from '../../src/modules/tenant/application/ports/tenant-event-recorder.port.js';
import { Tenant, type TenantSnapshot } from '../../src/modules/tenant/domain/aggregates/tenant.js';
import type { TenantId } from '../../src/modules/tenant/domain/value-objects/tenant-id.js';
import type { TenantRepository } from '../../src/modules/tenant/domain/repositories/tenant.repository.js';
import { TenantName } from '../../src/modules/tenant/domain/value-objects/tenant-name.js';
import type { DomainEvent } from '../../src/shared/messaging/domain-event.js';
import { staleRevisionConflict } from '../../src/shared/persistence/optimistic-concurrency.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../src/shared/persistence/persistence-error.js';
import type { Loaded, WriteReceipt } from '../../src/shared/persistence/repository-ports.js';
import { Revision } from '../../src/shared/persistence/revision.js';
import type { TransactionBoundary } from '../../src/shared/transaction/transaction-boundary.js';
import { DateTime } from '../../src/shared/time/date-time.js';

/**
 * Test doubles for the tenant module (IAM-001).
 *
 * They implement the module's own ports, never the Drizzle adapter, so the
 * domain and application tests run without a database while still exercising
 * the real use cases and the real shared kernel. The repository double stores
 * *snapshots* and hands back rehydrated copies, exactly like the real adapter,
 * so a test cannot accidentally pass because it mutated a shared object.
 */

/** In-memory `TenantRepository` with the shared compare-and-swap semantics. */
export class InMemoryTenantRepository implements TenantRepository {
  private readonly records = new Map<string, { snapshot: TenantSnapshot; revision: Revision }>();

  /** Counts mutations, so a test can prove no hidden retry happened. */
  public addCalls = 0;
  public updateCalls = 0;

  /** Seeds a tenant without going through `add` (for read/update tests). */
  public seed(tenant: Tenant, revision: Revision = Revision.initial()): void {
    this.records.set(tenant.id.value, { snapshot: tenant.snapshot(), revision });
  }

  /** The stored revision, to assert what actually landed. */
  public revisionOf(id: TenantId): Revision | undefined {
    return this.records.get(id.value)?.revision;
  }

  /** The stored state, or `undefined`. */
  public stored(id: TenantId): Tenant | undefined {
    const record = this.records.get(id.value);
    return record === undefined ? undefined : Tenant.rehydrate(record.snapshot);
  }

  public async get(id: TenantId): Promise<Loaded<Tenant> | undefined> {
    const record = this.records.get(id.value);
    return record === undefined
      ? undefined
      : { aggregate: Tenant.rehydrate(record.snapshot), revision: record.revision };
  }

  public async add(tenant: Tenant): Promise<WriteReceipt> {
    this.addCalls += 1;
    if (this.records.has(tenant.id.value)) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'TenantRepository.add');
    }
    this.records.set(tenant.id.value, {
      snapshot: tenant.snapshot(),
      revision: Revision.initial(),
    });
    return { revision: Revision.initial() };
  }

  public async update(tenant: Tenant, expectedRevision: Revision): Promise<WriteReceipt> {
    this.updateCalls += 1;
    const record = this.records.get(tenant.id.value);

    if (record === undefined || !record.revision.equals(expectedRevision)) {
      throw staleRevisionConflict('TenantRepository.update', expectedRevision);
    }

    const next = expectedRevision.next();
    this.records.set(tenant.id.value, { snapshot: tenant.snapshot(), revision: next });
    return { revision: next };
  }
}

/** Records every domain event a use case raises, in order. */
export class RecordingTenantEvents implements TenantEventRecorder {
  public readonly recorded: DomainEvent<unknown>[] = [];

  public async record(event: DomainEvent<unknown>): Promise<void> {
    this.recorded.push(event);
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
export const FIXED_NOW = DateTime.parse('2026-10-03T08:00:00.000Z');

/** Builds a tenant for seeding, with a fixed identity and name. */
export function aTenant(name = 'Acme Trading Co.', now: DateTime = FIXED_NOW): Tenant {
  return Tenant.create({ name: TenantName.from(name), now });
}
