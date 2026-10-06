import type { RoleEventRecorder } from '../../src/modules/identity/application/ports/role-event-recorder.port.js';
import {
  MembershipRole,
  type MembershipRoleSnapshot,
} from '../../src/modules/identity/domain/aggregates/membership-role.js';
import { Role, type RoleSnapshot } from '../../src/modules/identity/domain/aggregates/role.js';
import type { MembershipRoleRepository } from '../../src/modules/identity/domain/repositories/membership-role.repository.js';
import type { RoleRepository } from '../../src/modules/identity/domain/repositories/role.repository.js';
import type { MembershipId } from '../../src/modules/identity/domain/value-objects/membership-id.js';
import type { MembershipRoleId } from '../../src/modules/identity/domain/value-objects/membership-role-id.js';
import type { RoleId } from '../../src/modules/identity/domain/value-objects/role-id.js';
import type { TenantReference } from '../../src/modules/identity/domain/value-objects/tenant-reference.js';
import type { DomainEvent } from '../../src/shared/messaging/domain-event.js';
import { staleRevisionConflict } from '../../src/shared/persistence/optimistic-concurrency.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../src/shared/persistence/persistence-error.js';
import type { Loaded, WriteReceipt } from '../../src/shared/persistence/repository-ports.js';
import { Revision } from '../../src/shared/persistence/revision.js';

/**
 * Test doubles for the identity role/permission feature (IAM-004).
 *
 * They implement the feature's own ports, never the Drizzle adapter, so the
 * domain and application tests run without a database while still exercising the
 * real use cases and the real shared kernel. Each repository double stores
 * *snapshots* and hands back rehydrated copies, exactly like the real adapter.
 *
 * The membership-role double enforces the same `(membership, role)` uniqueness
 * the table enforces through its unique key, so a test cannot pass by relying on
 * a weaker in-memory rule: a second assignment for the same pair is refused just
 * as the database would refuse it.
 *
 * The tenant directory, transaction boundary and fixed instant are re-exported
 * from the membership doubles so every identity test uses the same ones.
 */

/** In-memory `RoleRepository` with the shared compare-and-swap semantics. */
export class InMemoryRoleRepository implements RoleRepository {
  private readonly records = new Map<string, { snapshot: RoleSnapshot; revision: Revision }>();

  /** Counts mutations, so a test can prove no hidden retry happened. */
  public addCalls = 0;
  public updateCalls = 0;

  /**
   * Makes the next `add` fail as a unique-key conflict without storing anything,
   * modelling a concurrent creator that won the identity between the caller's
   * check and its insert. Consumed by the failing call.
   */
  public conflictOnNextAdd = false;

  /** Seeds a role without going through `add` (for read/update tests). */
  public seed(role: Role, revision: Revision = Revision.initial()): void {
    this.records.set(role.id.value, { snapshot: role.snapshot(), revision });
  }

  /** The stored revision, to assert what actually landed. */
  public revisionOf(id: RoleId): Revision | undefined {
    return this.records.get(id.value)?.revision;
  }

  /** The stored state, or `undefined`. */
  public stored(id: RoleId): Role | undefined {
    const record = this.records.get(id.value);
    return record === undefined ? undefined : Role.rehydrate(record.snapshot);
  }

  public async get(id: RoleId): Promise<Loaded<Role> | undefined> {
    const record = this.records.get(id.value);
    return record === undefined
      ? undefined
      : { aggregate: Role.rehydrate(record.snapshot), revision: record.revision };
  }

  public async add(role: Role): Promise<WriteReceipt> {
    this.addCalls += 1;
    if (this.conflictOnNextAdd || this.records.has(role.id.value)) {
      this.conflictOnNextAdd = false;
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'RoleRepository.add');
    }
    this.records.set(role.id.value, {
      snapshot: role.snapshot(),
      revision: Revision.initial(),
    });
    return { revision: Revision.initial() };
  }

  public async update(role: Role, expectedRevision: Revision): Promise<WriteReceipt> {
    this.updateCalls += 1;
    const record = this.records.get(role.id.value);

    if (record === undefined || !record.revision.equals(expectedRevision)) {
      throw staleRevisionConflict('RoleRepository.update', expectedRevision);
    }

    const next = expectedRevision.next();
    this.records.set(role.id.value, { snapshot: role.snapshot(), revision: next });
    return { revision: next };
  }

  public async findByTenantId(tenantId: TenantReference): Promise<readonly Loaded<Role>[]> {
    return this.loaded().filter((record) => record.aggregate.tenantId.value === tenantId.value);
  }

  private loaded(): Loaded<Role>[] {
    return Array.from(this.records.values()).map((record) => ({
      aggregate: Role.rehydrate(record.snapshot),
      revision: record.revision,
    }));
  }
}

/**
 * In-memory `MembershipRoleRepository`.
 *
 * Besides the compare-and-swap semantics, it enforces the `(membership, role)`
 * uniqueness the production table enforces with a unique key: a second `add` for
 * a pair that already has an assignment (in any state) is refused as a conflict.
 * That is what makes the "one record per pair, reactivate rather than duplicate"
 * rule testable.
 */
export class InMemoryMembershipRoleRepository implements MembershipRoleRepository {
  private readonly records = new Map<
    string,
    { snapshot: MembershipRoleSnapshot; revision: Revision }
  >();

  public addCalls = 0;
  public updateCalls = 0;

  /** Seeds an assignment without going through `add`. */
  public seed(assignment: MembershipRole, revision: Revision = Revision.initial()): void {
    this.records.set(assignment.id.value, { snapshot: assignment.snapshot(), revision });
  }

  /** The stored revision, to assert what actually landed. */
  public revisionOf(id: MembershipRoleId): Revision | undefined {
    return this.records.get(id.value)?.revision;
  }

  /** The stored state, or `undefined`. */
  public stored(id: MembershipRoleId): MembershipRole | undefined {
    const record = this.records.get(id.value);
    return record === undefined ? undefined : MembershipRole.rehydrate(record.snapshot);
  }

  /** How many assignment records exist, in any state. */
  public get size(): number {
    return this.records.size;
  }

  public async get(id: MembershipRoleId): Promise<Loaded<MembershipRole> | undefined> {
    const record = this.records.get(id.value);
    return record === undefined
      ? undefined
      : { aggregate: MembershipRole.rehydrate(record.snapshot), revision: record.revision };
  }

  public async add(assignment: MembershipRole): Promise<WriteReceipt> {
    this.addCalls += 1;
    if (this.records.has(assignment.id.value)) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'MembershipRoleRepository.add');
    }
    const pairTaken =
      (await this.findPair(assignment.membershipId, assignment.roleId)) !== undefined;
    if (pairTaken) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'MembershipRoleRepository.add');
    }
    this.records.set(assignment.id.value, {
      snapshot: assignment.snapshot(),
      revision: Revision.initial(),
    });
    return { revision: Revision.initial() };
  }

  public async update(
    assignment: MembershipRole,
    expectedRevision: Revision,
  ): Promise<WriteReceipt> {
    this.updateCalls += 1;
    const record = this.records.get(assignment.id.value);

    if (record === undefined || !record.revision.equals(expectedRevision)) {
      throw staleRevisionConflict('MembershipRoleRepository.update', expectedRevision);
    }

    const next = expectedRevision.next();
    this.records.set(assignment.id.value, { snapshot: assignment.snapshot(), revision: next });
    return { revision: next };
  }

  public async findByMembershipId(
    membershipId: MembershipId,
  ): Promise<readonly Loaded<MembershipRole>[]> {
    return this.loaded().filter(
      (record) => record.aggregate.membershipId.value === membershipId.value,
    );
  }

  public async findPair(
    membershipId: MembershipId,
    roleId: RoleId,
  ): Promise<Loaded<MembershipRole> | undefined> {
    return this.loaded().find(
      (record) =>
        record.aggregate.membershipId.value === membershipId.value &&
        record.aggregate.roleId.value === roleId.value,
    );
  }

  private loaded(): Loaded<MembershipRole>[] {
    return Array.from(this.records.values()).map((record) => ({
      aggregate: MembershipRole.rehydrate(record.snapshot),
      revision: record.revision,
    }));
  }
}

/** Records every role/permission domain event a use case raises, in order. */
export class RecordingRoleEvents implements RoleEventRecorder {
  public readonly recorded: DomainEvent<unknown>[] = [];

  public async record(event: DomainEvent<unknown>): Promise<void> {
    this.recorded.push(event);
  }
}

export {
  FIXED_NOW,
  PassthroughTransactionBoundary,
  StubTenantDirectory,
} from './membership-doubles.js';
