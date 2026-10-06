import type { UserEventRecorder } from '../../src/modules/identity/application/ports/user-event-recorder.port.js';
import { User, type UserSnapshot } from '../../src/modules/identity/domain/aggregates/user.js';
import type { UserRepository } from '../../src/modules/identity/domain/repositories/user.repository.js';
import type { UserId } from '../../src/modules/identity/domain/value-objects/user-id.js';
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
 * Test doubles for the identity/user module (IAM-002).
 *
 * They implement the module's own ports, never the Drizzle adapter, so the
 * domain and application tests run without a database while still exercising
 * the real use cases and the real shared kernel. The repository double stores
 * *snapshots* and hands back rehydrated copies, exactly like the real adapter,
 * so a test cannot accidentally pass because it mutated a shared object.
 */

/** In-memory `UserRepository` with the shared compare-and-swap semantics. */
export class InMemoryUserRepository implements UserRepository {
  private readonly records = new Map<string, { snapshot: UserSnapshot; revision: Revision }>();

  /** Counts mutations, so a test can prove no hidden retry happened. */
  public addCalls = 0;
  public updateCalls = 0;

  /** Seeds a user without going through `add` (for read/update tests). */
  public seed(user: User, revision: Revision = Revision.initial()): void {
    this.records.set(user.id.value, { snapshot: user.snapshot(), revision });
  }

  /** The stored revision, to assert what actually landed. */
  public revisionOf(id: UserId): Revision | undefined {
    return this.records.get(id.value)?.revision;
  }

  /** The stored state, or `undefined`. */
  public stored(id: UserId): User | undefined {
    const record = this.records.get(id.value);
    return record === undefined ? undefined : User.rehydrate(record.snapshot);
  }

  public async get(id: UserId): Promise<Loaded<User> | undefined> {
    const record = this.records.get(id.value);
    return record === undefined
      ? undefined
      : { aggregate: User.rehydrate(record.snapshot), revision: record.revision };
  }

  public async add(user: User): Promise<WriteReceipt> {
    this.addCalls += 1;
    if (this.records.has(user.id.value)) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'UserRepository.add');
    }
    const duplicateEmail = await this.existsByEmail(user.email.value);
    if (duplicateEmail) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'UserRepository.add');
    }
    this.records.set(user.id.value, {
      snapshot: user.snapshot(),
      revision: Revision.initial(),
    });
    return { revision: Revision.initial() };
  }

  public async update(user: User, expectedRevision: Revision): Promise<WriteReceipt> {
    this.updateCalls += 1;
    const record = this.records.get(user.id.value);

    if (record === undefined || !record.revision.equals(expectedRevision)) {
      throw staleRevisionConflict('UserRepository.update', expectedRevision);
    }

    const next = expectedRevision.next();
    this.records.set(user.id.value, { snapshot: user.snapshot(), revision: next });
    return { revision: next };
  }

  public async existsByEmail(email: string): Promise<boolean> {
    const lower = email.trim().toLowerCase();
    return Array.from(this.records.values()).some((record) => record.snapshot.email === lower);
  }

  public async existsById(id: UserId): Promise<boolean> {
    return this.records.has(id.value);
  }
}

/** Records every domain event a use case raises, in order. */
export class RecordingUserEvents implements UserEventRecorder {
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

/** Builds a user for seeding, with a fixed name and email. */
export function aUser(
  displayName = 'Ali Rezaei',
  email = 'ali@example.com',
  now: DateTime = FIXED_NOW,
): User {
  return User.create({ displayName, email, now });
}
