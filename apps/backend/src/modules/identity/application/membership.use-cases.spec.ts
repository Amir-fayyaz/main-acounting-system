import { describe, expect, it } from 'vitest';
import { ConflictError } from '../../../shared/errors/category-errors.js';
import { EntityId } from '../../../shared/id/entity-id.js';
import { createTenantContext } from '../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../shared/tenant/tenant-scope.js';
import { TenantContextMissingError } from '../../../shared/tenant/tenant.errors.js';
import {
  FIXED_NOW,
  InMemoryMembershipRepository,
  PassthroughTransactionBoundary,
  RecordingMembershipEvents,
  StubTenantDirectory,
} from '../../../../test/support/membership-doubles.js';
import { InMemoryUserRepository, aUser } from '../../../../test/support/user-doubles.js';
import { Membership } from '../domain/aggregates/membership.js';
import { membershipIdFrom } from '../domain/value-objects/membership-id.js';
import { tenantReferenceFrom } from '../domain/value-objects/tenant-reference.js';
import type { UserId } from '../domain/value-objects/user-id.js';
import { ChangeMembershipStatus } from './commands/change-membership-status.command.js';
import { CreateMembership } from './commands/create-membership.command.js';
import { GetMembership } from './queries/get-membership.query.js';
import { ListTenantMembers } from './queries/list-tenant-members.query.js';
import { ListUserMemberships } from './queries/list-user-memberships.query.js';
import { ChangeMembershipStatusUseCase } from './use-cases/change-membership-status.use-case.js';
import { CreateMembershipUseCase } from './use-cases/create-membership.use-case.js';
import { GetMembershipUseCase } from './use-cases/get-membership.use-case.js';
import { ListTenantMembersUseCase } from './use-cases/list-tenant-members.use-case.js';
import { ListUserMembershipsUseCase } from './use-cases/list-user-memberships.use-case.js';

interface Harness {
  readonly repository: InMemoryMembershipRepository;
  readonly users: InMemoryUserRepository;
  readonly tenants: StubTenantDirectory;
  readonly events: RecordingMembershipEvents;
  readonly boundary: PassthroughTransactionBoundary;
  readonly createMembership: CreateMembershipUseCase;
  readonly getMembership: GetMembershipUseCase;
  readonly listUserMemberships: ListUserMembershipsUseCase;
  readonly listTenantMembers: ListTenantMembersUseCase;
  readonly changeMembershipStatus: ChangeMembershipStatusUseCase;
}

function harness(): Harness {
  const repository = new InMemoryMembershipRepository();
  const users = new InMemoryUserRepository();
  const tenants = new StubTenantDirectory();
  const events = new RecordingMembershipEvents();
  const boundary = new PassthroughTransactionBoundary();

  return {
    repository,
    users,
    tenants,
    events,
    boundary,
    createMembership: new CreateMembershipUseCase(repository, users, tenants, events, boundary),
    getMembership: new GetMembershipUseCase(repository),
    listUserMemberships: new ListUserMembershipsUseCase(repository, users),
    listTenantMembers: new ListTenantMembersUseCase(repository, users),
    changeMembershipStatus: new ChangeMembershipStatusUseCase(repository, events, boundary),
  };
}

/** Runs tenant-scoped work the way the trusted entry point does. */
function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), work);
}

function randomId(): string {
  return EntityId.generate().value;
}

/** Seeds an existing user and tenant, returning their identities. */
function seededTenant(app: Harness): { userId: UserId; tenantId: string } {
  const user = aUser();
  app.users.seed(user);
  const tenantId = randomId();
  app.tenants.grant(tenantId);

  return { userId: user.id, tenantId };
}

/** Seeds a membership directly, without going through the create use case. */
function seedMembership(
  app: Harness,
  userId: UserId,
  tenantId: string,
  status: 'active' | 'inactive' = 'active',
): Membership {
  const now = FIXED_NOW;
  const membership = Membership.create({ userId, tenantId: tenantReferenceFrom(tenantId), now });
  if (status === 'inactive') {
    membership.deactivate(now);
  }
  app.repository.seed(membership);

  return membership;
}

describe('membership use cases', () => {
  describe('create', () => {
    it('creates an active membership, persists it and records a tenant-scoped event', async () => {
      const app = harness();
      const { userId, tenantId } = seededTenant(app);

      const outcome = await inTenant(tenantId, () =>
        app.createMembership.execute(new CreateMembership({ userId: userId.value, tenantId })),
      );

      expect(outcome.isOk()).toBe(true);
      const view = outcome.valueOrThrow();
      expect(view.userId).toBe(userId.value);
      expect(view.tenantId).toBe(tenantId);
      expect(view.status).toBe('active');
      expect(view.revision).toBe(1);
      expect(view.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(view.createdAt).toBe(view.updatedAt);
      expect(app.repository.addCalls).toBe(1);
      expect(app.boundary.executions).toBe(1);

      expect(app.events.recorded).toHaveLength(1);
      expect(app.events.recorded[0]?.name).toBe('MembershipCreated');
      expect(app.events.recorded[0]?.metadata.tenantId).toBe(tenantId);
    });

    it('accepts an existing user and tenant and links exactly them', async () => {
      const app = harness();
      const { userId, tenantId } = seededTenant(app);

      const outcome = await inTenant(tenantId, () =>
        app.createMembership.execute(new CreateMembership({ userId: userId.value, tenantId })),
      );

      const stored = app.repository.stored(
        // The created identity is the one the view reports.
        membershipIdFrom(outcome.valueOrThrow().id),
      );
      expect(stored?.userId.equals(userId)).toBe(true);
      expect(stored?.tenantId.value).toBe(tenantId);
    });

    it('rejects a malformed user id as an expected failure without persisting', async () => {
      const app = harness();
      const tenantId = randomId();
      app.tenants.grant(tenantId);

      const outcome = await inTenant(tenantId, () =>
        app.createMembership.execute(new CreateMembership({ userId: 'not-a-uuid', tenantId })),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('VALIDATION_FAILED');
      expect(app.repository.addCalls).toBe(0);
      expect(app.events.recorded).toEqual([]);
    });

    it('refuses an unknown user without persisting', async () => {
      const app = harness();
      const tenantId = randomId();
      app.tenants.grant(tenantId);

      const outcome = await inTenant(tenantId, () =>
        app.createMembership.execute(new CreateMembership({ userId: randomId(), tenantId })),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('USER_NOT_FOUND');
      expect(app.repository.addCalls).toBe(0);
    });

    it('refuses a tenant that does not exist, through the published contract', async () => {
      const app = harness();
      const user = aUser();
      app.users.seed(user);
      const tenantId = randomId();

      const outcome = await inTenant(tenantId, () =>
        app.createMembership.execute(new CreateMembership({ userId: user.id.value, tenantId })),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('MEMBERSHIP_TENANT_NOT_FOUND');
      expect(app.repository.addCalls).toBe(0);
    });

    it('refuses a duplicate membership for the same user and tenant', async () => {
      const app = harness();
      const { userId, tenantId } = seededTenant(app);

      await inTenant(tenantId, () =>
        app.createMembership.execute(new CreateMembership({ userId: userId.value, tenantId })),
      );
      const outcome = await inTenant(tenantId, () =>
        app.createMembership.execute(new CreateMembership({ userId: userId.value, tenantId })),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('DUPLICATE_MEMBERSHIP');
      expect(outcome.errorOrThrow().category).toBe('CONFLICT');
      expect(app.repository.addCalls).toBe(1);
    });

    it('refuses a duplicate even when the existing membership is inactive', async () => {
      const app = harness();
      const { userId, tenantId } = seededTenant(app);
      seedMembership(app, userId, tenantId, 'inactive');

      const outcome = await inTenant(tenantId, () =>
        app.createMembership.execute(new CreateMembership({ userId: userId.value, tenantId })),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('DUPLICATE_MEMBERSHIP');
      expect(app.repository.addCalls).toBe(0);
    });

    it('reports a lost creation race as a duplicate, not a server error', async () => {
      const app = harness();
      const { userId, tenantId } = seededTenant(app);
      // A concurrent creator won between the existence check and the insert.
      app.repository.conflictOnNextAdd = true;

      const outcome = await inTenant(tenantId, () =>
        app.createMembership.execute(new CreateMembership({ userId: userId.value, tenantId })),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('DUPLICATE_MEMBERSHIP');
    });

    it('does not read or write outside the resolved tenant scope', async () => {
      const app = harness();
      const { userId, tenantId } = seededTenant(app);
      const otherTenant = randomId();
      app.tenants.grant(otherTenant);

      const outcome = await inTenant(otherTenant, () =>
        app.createMembership.execute(new CreateMembership({ userId: userId.value, tenantId })),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('NOT_FOUND');
      expect(app.repository.addCalls).toBe(0);
    });

    it('fails closed without a tenant scope', async () => {
      const app = harness();
      const { userId, tenantId } = seededTenant(app);

      await expect(
        app.createMembership.execute(new CreateMembership({ userId: userId.value, tenantId })),
      ).rejects.toThrow(TenantContextMissingError);
      expect(app.repository.addCalls).toBe(0);
    });
  });

  describe('get', () => {
    it('reads a membership within its tenant scope', async () => {
      const app = harness();
      const user = aUser();
      app.users.seed(user);
      const tenantId = randomId();
      const membership = seedMembership(app, user.id, tenantId);

      const outcome = await inTenant(tenantId, () =>
        app.getMembership.execute(
          new GetMembership({ membershipId: membership.id.value, tenantId }),
        ),
      );

      expect(outcome.valueOrThrow()).toMatchObject({
        id: membership.id.value,
        userId: user.id.value,
        tenantId,
        status: 'active',
        revision: 1,
      });
    });

    it('answers not-found for an unknown membership', async () => {
      const app = harness();
      const tenantId = randomId();

      const outcome = await inTenant(tenantId, () =>
        app.getMembership.execute(new GetMembership({ membershipId: randomId(), tenantId })),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('NOT_FOUND');
    });

    it('does not read a membership that belongs to another tenant', async () => {
      const app = harness();
      const user = aUser();
      app.users.seed(user);
      const ownerTenant = randomId();
      const membership = seedMembership(app, user.id, ownerTenant);
      const otherTenant = randomId();

      const outcome = await inTenant(otherTenant, () =>
        app.getMembership.execute(
          new GetMembership({ membershipId: membership.id.value, tenantId: otherTenant }),
        ),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('NOT_FOUND');
    });

    it('fails closed without a tenant scope', async () => {
      const app = harness();
      const user = aUser();
      app.users.seed(user);
      const tenantId = randomId();
      const membership = seedMembership(app, user.id, tenantId);

      await expect(
        app.getMembership.execute(
          new GetMembership({ membershipId: membership.id.value, tenantId }),
        ),
      ).rejects.toThrow(TenantContextMissingError);
    });
  });

  describe('change status', () => {
    it('deactivates an active membership and keeps the record', async () => {
      const app = harness();
      const user = aUser();
      app.users.seed(user);
      const tenantId = randomId();
      const membership = seedMembership(app, user.id, tenantId);

      const outcome = await inTenant(tenantId, () =>
        app.changeMembershipStatus.execute(
          new ChangeMembershipStatus({
            membershipId: membership.id.value,
            tenantId,
            status: 'inactive',
            expectedRevision: 1,
          }),
        ),
      );

      expect(outcome.valueOrThrow()).toMatchObject({ status: 'inactive', revision: 2 });
      expect(app.repository.stored(membership.id)?.status.value).toBe('inactive');
      expect(app.events.recorded[0]?.name).toBe('MembershipStatusChanged');
      expect(app.events.recorded[0]?.metadata.tenantId).toBe(tenantId);

      // Neither the user nor the tenant is affected by deactivation.
      expect(app.users.stored(user.id)).toBeDefined();
    });

    it('reactivates an inactive membership', async () => {
      const app = harness();
      const user = aUser();
      app.users.seed(user);
      const tenantId = randomId();
      const membership = seedMembership(app, user.id, tenantId, 'inactive');

      const outcome = await inTenant(tenantId, () =>
        app.changeMembershipStatus.execute(
          new ChangeMembershipStatus({
            membershipId: membership.id.value,
            tenantId,
            status: 'active',
            expectedRevision: 1,
          }),
        ),
      );

      expect(outcome.valueOrThrow()).toMatchObject({ status: 'active', revision: 2 });
    });

    it('rejects an invalid transition and keeps the state', async () => {
      const app = harness();
      const user = aUser();
      app.users.seed(user);
      const tenantId = randomId();
      const membership = seedMembership(app, user.id, tenantId);

      const outcome = await inTenant(tenantId, () =>
        app.changeMembershipStatus.execute(
          new ChangeMembershipStatus({
            membershipId: membership.id.value,
            tenantId,
            status: 'active',
            expectedRevision: 1,
          }),
        ),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('INVALID_MEMBERSHIP_STATUS_TRANSITION');
      expect(app.repository.stored(membership.id)?.status.value).toBe('active');
      expect(app.repository.updateCalls).toBe(0);
    });

    it('rejects an unknown status as an expected validation failure', async () => {
      const app = harness();
      const user = aUser();
      app.users.seed(user);
      const tenantId = randomId();
      const membership = seedMembership(app, user.id, tenantId);

      const outcome = await inTenant(tenantId, () =>
        app.changeMembershipStatus.execute(
          new ChangeMembershipStatus({
            membershipId: membership.id.value,
            tenantId,
            status: 'revoked' as never,
            expectedRevision: 1,
          }),
        ),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('VALIDATION_FAILED');
    });

    it('does not change a membership that belongs to another tenant', async () => {
      const app = harness();
      const user = aUser();
      app.users.seed(user);
      const ownerTenant = randomId();
      const membership = seedMembership(app, user.id, ownerTenant);
      const otherTenant = randomId();

      const outcome = await inTenant(otherTenant, () =>
        app.changeMembershipStatus.execute(
          new ChangeMembershipStatus({
            membershipId: membership.id.value,
            tenantId: otherTenant,
            status: 'inactive',
            expectedRevision: 1,
          }),
        ),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('NOT_FOUND');
      expect(app.repository.stored(membership.id)?.status.value).toBe('active');
    });

    it('detects a conflicting concurrent change and keeps the winner', async () => {
      const app = harness();
      const user = aUser();
      app.users.seed(user);
      const tenantId = randomId();
      const membership = seedMembership(app, user.id, tenantId, 'inactive');

      const first = await inTenant(tenantId, () =>
        app.changeMembershipStatus.execute(
          new ChangeMembershipStatus({
            membershipId: membership.id.value,
            tenantId,
            status: 'active',
            expectedRevision: 1,
          }),
        ),
      );
      const second = await inTenant(tenantId, () =>
        app.changeMembershipStatus.execute(
          new ChangeMembershipStatus({
            membershipId: membership.id.value,
            tenantId,
            status: 'inactive',
            expectedRevision: 1,
          }),
        ),
      );

      expect(first.isOk()).toBe(true);
      expect(second.isFail()).toBe(true);
      expect(second.errorOrThrow()).toBeInstanceOf(ConflictError);
      expect(app.repository.stored(membership.id)?.status.value).toBe('active');
      expect(app.repository.revisionOf(membership.id)?.value).toBe(2);
    });

    it('rejects a stale expected revision that is not a positive integer', async () => {
      const app = harness();
      const user = aUser();
      app.users.seed(user);
      const tenantId = randomId();
      const membership = seedMembership(app, user.id, tenantId);

      const outcome = await inTenant(tenantId, () =>
        app.changeMembershipStatus.execute(
          new ChangeMembershipStatus({
            membershipId: membership.id.value,
            tenantId,
            status: 'inactive',
            expectedRevision: 0,
          }),
        ),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('VALIDATION_FAILED');
      expect(app.repository.updateCalls).toBe(0);
    });

    it('fails closed without a tenant scope', async () => {
      const app = harness();
      const user = aUser();
      app.users.seed(user);
      const tenantId = randomId();
      const membership = seedMembership(app, user.id, tenantId);

      await expect(
        app.changeMembershipStatus.execute(
          new ChangeMembershipStatus({
            membershipId: membership.id.value,
            tenantId,
            status: 'inactive',
            expectedRevision: 1,
          }),
        ),
      ).rejects.toThrow(TenantContextMissingError);
    });
  });

  describe('list user memberships', () => {
    it('reads every membership of a user, whatever its state', async () => {
      const app = harness();
      const user = aUser();
      app.users.seed(user);
      const active = seedMembership(app, user.id, randomId());
      const inactive = seedMembership(app, user.id, randomId(), 'inactive');

      const outcome = await app.listUserMemberships.execute(
        new ListUserMemberships({ userId: user.id.value }),
      );

      const memberships = outcome.valueOrThrow();
      expect(memberships).toHaveLength(2);
      expect(memberships.map((membership) => membership.status).sort()).toEqual([
        'active',
        'inactive',
      ]);
      expect(memberships.map((membership) => membership.id).sort()).toEqual(
        [active.id.value, inactive.id.value].sort(),
      );
    });

    it('does not include another user’s memberships', async () => {
      const app = harness();
      const user = aUser();
      const other = aUser('Other', 'other@example.com');
      app.users.seed(user);
      app.users.seed(other);
      seedMembership(app, user.id, randomId());
      seedMembership(app, other.id, randomId());

      const outcome = await app.listUserMemberships.execute(
        new ListUserMemberships({ userId: user.id.value }),
      );

      expect(outcome.valueOrThrow()).toHaveLength(1);
      expect(outcome.valueOrThrow()[0]?.userId).toBe(user.id.value);
    });

    it('answers not-found for an unknown or malformed user', async () => {
      const app = harness();

      const unknown = await app.listUserMemberships.execute(
        new ListUserMemberships({ userId: randomId() }),
      );
      const malformed = await app.listUserMemberships.execute(
        new ListUserMemberships({ userId: 'not-a-uuid' }),
      );

      expect(unknown.errorOrThrow().code).toBe('USER_NOT_FOUND');
      expect(malformed.errorOrThrow().code).toBe('USER_NOT_FOUND');
    });

    it('does not require a tenant scope', async () => {
      const app = harness();
      const user = aUser();
      app.users.seed(user);
      seedMembership(app, user.id, randomId());

      const outcome = await app.listUserMemberships.execute(
        new ListUserMemberships({ userId: user.id.value }),
      );

      expect(outcome.isOk()).toBe(true);
    });
  });

  describe('list tenant members', () => {
    it('reads the tenant’s members with current user data', async () => {
      const app = harness();
      const ali = aUser('Ali Rezaei', 'ali@example.com');
      const sara = aUser('Sara Ahmadi', 'sara@example.com');
      app.users.seed(ali);
      app.users.seed(sara);
      const tenantId = randomId();
      seedMembership(app, ali.id, tenantId);
      seedMembership(app, sara.id, tenantId, 'inactive');

      const outcome = await inTenant(tenantId, () =>
        app.listTenantMembers.execute(new ListTenantMembers({ tenantId })),
      );

      const members = outcome.valueOrThrow();
      expect(members).toHaveLength(2);
      expect(members.map((member) => member.displayName).sort()).toEqual([
        'Ali Rezaei',
        'Sara Ahmadi',
      ]);
      expect(members.find((member) => member.userId === sara.id.value)?.status).toBe('inactive');
      expect(members.every((member) => member.userStatus === 'active')).toBe(true);
    });

    it('does not bypass the tenant boundary', async () => {
      const app = harness();
      const ali = aUser('Ali Rezaei', 'ali@example.com');
      app.users.seed(ali);
      const tenantId = randomId();
      const otherTenant = randomId();
      const inTenantMembership = seedMembership(app, ali.id, tenantId);
      seedMembership(app, ali.id, otherTenant);

      const outcome = await inTenant(tenantId, () =>
        app.listTenantMembers.execute(new ListTenantMembers({ tenantId })),
      );

      const members = outcome.valueOrThrow();
      expect(members).toHaveLength(1);
      expect(members[0]?.membershipId).toBe(inTenantMembership.id.value);
    });

    it('answers not-found when the requested tenant is not the scoped tenant', async () => {
      const app = harness();
      const tenantId = randomId();
      const otherTenant = randomId();

      const outcome = await inTenant(otherTenant, () =>
        app.listTenantMembers.execute(new ListTenantMembers({ tenantId })),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('NOT_FOUND');
    });

    it('fails closed without a tenant scope', async () => {
      const app = harness();

      await expect(
        app.listTenantMembers.execute(new ListTenantMembers({ tenantId: randomId() })),
      ).rejects.toThrow(TenantContextMissingError);
    });
  });

  describe('tenant context integration', () => {
    it('treats the tenant identity as the tenant boundary string', async () => {
      const app = harness();
      const { userId, tenantId } = seededTenant(app);

      const outcome = await inTenant(tenantId, () =>
        app.createMembership.execute(new CreateMembership({ userId: userId.value, tenantId })),
      );

      expect(outcome.valueOrThrow().tenantId).toBe(tenantId);
    });
  });
});
