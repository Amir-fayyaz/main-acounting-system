import { env } from 'node:process';

import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool } from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../src/infrastructure/config/dotenv.js';
import type { Database } from '../src/infrastructure/database/database.module.js';
import { DrizzleTransactionRunner } from '../src/infrastructure/database/drizzle-transaction-runner.js';
import { ChangeMembershipStatus } from '../src/modules/identity/application/commands/change-membership-status.command.js';
import { CreateMembership } from '../src/modules/identity/application/commands/create-membership.command.js';
import { ListTenantMembers } from '../src/modules/identity/application/queries/list-tenant-members.query.js';
import { ListUserMemberships } from '../src/modules/identity/application/queries/list-user-memberships.query.js';
import { ChangeMembershipStatusUseCase } from '../src/modules/identity/application/use-cases/change-membership-status.use-case.js';
import { CreateMembershipUseCase } from '../src/modules/identity/application/use-cases/create-membership.use-case.js';
import { ListTenantMembersUseCase } from '../src/modules/identity/application/use-cases/list-tenant-members.use-case.js';
import { ListUserMembershipsUseCase } from '../src/modules/identity/application/use-cases/list-user-memberships.use-case.js';
import { Membership } from '../src/modules/identity/domain/aggregates/membership.js';
import { User } from '../src/modules/identity/domain/aggregates/user.js';
import { membershipIdFrom } from '../src/modules/identity/domain/value-objects/membership-id.js';
import { DrizzleMembershipRepository } from '../src/modules/identity/infrastructure/persistence/drizzle-membership.repository.js';
import { ensureMembershipSchema } from '../src/modules/identity/infrastructure/persistence/drizzle-membership.schema.js';
import { DrizzleUserRepository } from '../src/modules/identity/infrastructure/persistence/drizzle-user.repository.js';
import { ensureUserSchema } from '../src/modules/identity/infrastructure/persistence/drizzle-user.schema.js';
import type { TenantDirectory } from '../src/modules/tenant/application/ports/tenant-directory.port.js';
import { Tenant } from '../src/modules/tenant/domain/aggregates/tenant.js';
import { isTenantId, tenantIdFrom } from '../src/modules/tenant/domain/value-objects/tenant-id.js';
import { TenantName } from '../src/modules/tenant/domain/value-objects/tenant-name.js';
import { DrizzleTenantRepository } from '../src/modules/tenant/infrastructure/persistence/drizzle-tenant.repository.js';
import { ensureTenantSchema } from '../src/modules/tenant/infrastructure/persistence/tenant.schema.js';
import { ConflictError } from '../src/shared/errors/category-errors.js';
import { toConflict } from '../src/shared/persistence/optimistic-concurrency.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../src/shared/persistence/persistence-error.js';
import { Revision } from '../src/shared/persistence/revision.js';
import { DateTime } from '../src/shared/time/date-time.js';
import { createTenantContext } from '../src/shared/tenant/tenant-context.js';
import { TenantScope } from '../src/shared/tenant/tenant-scope.js';
import { createTransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import type { TransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import { RecordingMembershipEvents } from './support/membership-doubles.js';

/**
 * Membership persistence against a real MySQL server (IAM-003).
 *
 * The unit tests prove the use cases over an in-memory repository; these prove
 * the parts only a real server can: the module's own table is created from its
 * DDL, a membership round-trips through Drizzle, a lifecycle change advances the
 * revision exactly once, two writers that read the same revision cannot both
 * commit — the loser's write is refused as the shared conflict — and the
 * `(user, tenant)` uniqueness invariant is enforced in storage as well as in the
 * module.
 *
 * Opt-in, so the required quality gate still runs without infrastructure:
 *
 * ```bash
 * pnpm infra:up
 * MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
 * ```
 *
 * The schemas are applied by the modules' idempotent, versioned DDL and dropped
 * afterwards, so the run leaves no migration implied.
 */
const integrationEnabled = env.MYSQL_INTEGRATION === '1';

const MEMBERSHIP_TABLE = 'memberships';
const USER_TABLE = 'users';
const TENANT_TABLE = 'tenants';

describe.skipIf(!integrationEnabled)('membership persistence (integration)', () => {
  let pool: Pool;
  let database: Database;
  let boundary: TransactionBoundary;
  let memberships: DrizzleMembershipRepository;
  let users: DrizzleUserRepository;
  let tenants: DrizzleTenantRepository;
  let directory: TenantDirectory;

  beforeAll(async () => {
    loadDotEnvFiles();

    const config = new AppConfigService(
      loadConfiguration({
        NODE_ENV: 'test',
        MYSQL_HOST: env.MYSQL_HOST,
        MYSQL_PORT: env.MYSQL_PORT,
        MYSQL_DATABASE: env.MYSQL_DATABASE,
        MYSQL_USER: env.MYSQL_USER,
        MYSQL_PASSWORD: env.MYSQL_PASSWORD,
      }),
    );

    pool = createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
      timezone: 'Z',
    });

    database = drizzle(pool);
    await ensureTenantSchema(database);
    await ensureUserSchema(database);
    await ensureMembershipSchema(database);

    memberships = new DrizzleMembershipRepository(database);
    users = new DrizzleUserRepository(database);
    tenants = new DrizzleTenantRepository(database);
    boundary = createTransactionBoundary(new DrizzleTransactionRunner(database));
    directory = {
      async exists(tenantId: string): Promise<boolean> {
        return isTenantId(tenantId) && (await tenants.get(tenantIdFrom(tenantId))) !== undefined;
      },
    };
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM ${MEMBERSHIP_TABLE}`);
    await pool.query(`DELETE FROM ${USER_TABLE}`);
    await pool.query(`DELETE FROM ${TENANT_TABLE}`);
  });

  afterAll(async () => {
    if (pool !== undefined) {
      await pool.query(`DROP TABLE IF EXISTS ${MEMBERSHIP_TABLE}`);
      await pool.query(`DROP TABLE IF EXISTS ${USER_TABLE}`);
      await pool.query(`DROP TABLE IF EXISTS ${TENANT_TABLE}`);
      await pool.end();
    }
  });

  async function seedUser(email = 'ali@example.com'): Promise<User> {
    const user = User.create({ displayName: 'Ali Rezaei', email, now: DateTime.now() });
    await users.add(user);

    return user;
  }

  async function seedTenant(name = 'Acme Trading Co.'): Promise<Tenant> {
    const tenant = Tenant.create({ name: TenantName.from(name), now: DateTime.now() });
    await tenants.add(tenant);

    return tenant;
  }

  function create(): CreateMembershipUseCase {
    return new CreateMembershipUseCase(
      memberships,
      users,
      directory,
      new RecordingMembershipEvents(),
      boundary,
    );
  }

  function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
    return TenantScope.run(createTenantContext(tenantId), work);
  }

  it('round-trips a membership and keeps its stable identifier', async () => {
    const user = await seedUser();
    const tenant = await seedTenant();

    const created = await inTenant(tenant.id.value, () =>
      create().execute(new CreateMembership({ userId: user.id.value, tenantId: tenant.id.value })),
    );
    expect(created.isOk()).toBe(true);
    const view = created.valueOrThrow();

    const stored = await memberships.get(membershipIdFrom(view.id));
    expect(stored).toBeDefined();
    expect(stored?.aggregate.userId.value).toBe(user.id.value);
    expect(stored?.aggregate.tenantId.value).toBe(tenant.id.value);
    expect(stored?.aggregate.status.value).toBe('active');
    expect(stored?.revision.value).toBe(1);
  });

  it('enforces the (user, tenant) uniqueness invariant in storage', async () => {
    const user = await seedUser();
    const tenant = await seedTenant();
    const now = DateTime.now();

    const first = Membership.create({
      userId: user.id,
      tenantId: tenantIdFrom(tenant.id.value),
      now,
    });
    await memberships.add(first);

    const second = Membership.create({
      userId: user.id,
      tenantId: tenantIdFrom(tenant.id.value),
      now,
    });

    let failure: unknown;
    try {
      await memberships.add(second);
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(PersistenceError);
    expect((failure as PersistenceError).kind).toBe(PersistenceFailureKind.CONFLICT);
    await expect(memberships.existsForPair(user.id, tenantIdFrom(tenant.id.value))).resolves.toBe(
      true,
    );
  });

  it('deactivates a membership without deleting the record', async () => {
    const user = await seedUser();
    const tenant = await seedTenant();
    const events = new RecordingMembershipEvents();
    const changeStatus = new ChangeMembershipStatusUseCase(memberships, events, boundary);

    const created = (
      await inTenant(tenant.id.value, () =>
        create().execute(
          new CreateMembership({ userId: user.id.value, tenantId: tenant.id.value }),
        ),
      )
    ).valueOrThrow();

    const deactivated = await inTenant(tenant.id.value, () =>
      changeStatus.execute(
        new ChangeMembershipStatus({
          membershipId: created.id,
          tenantId: tenant.id.value,
          status: 'inactive',
          expectedRevision: 1,
        }),
      ),
    );
    expect(deactivated.valueOrThrow()).toMatchObject({ status: 'inactive', revision: 2 });

    const stored = await memberships.get(membershipIdFrom(created.id));
    expect(stored?.aggregate.status.value).toBe('inactive');
    expect(stored?.aggregate.userId.value).toBe(user.id.value);

    // The user and tenant are untouched by deactivation.
    expect((await users.get(user.id))?.aggregate.status.value).toBe('active');
    expect((await tenants.get(tenant.id))?.aggregate.status.value).toBe('active');
  });

  it('refuses the second of two lifecycle writes that read the same revision', async () => {
    const user = await seedUser();
    const tenant = await seedTenant();
    const events = new RecordingMembershipEvents();
    const changeStatus = new ChangeMembershipStatusUseCase(memberships, events, boundary);

    const created = (
      await inTenant(tenant.id.value, () =>
        create().execute(
          new CreateMembership({ userId: user.id.value, tenantId: tenant.id.value }),
        ),
      )
    ).valueOrThrow();
    const id = membershipIdFrom(created.id);

    const observed = await memberships.get(id);
    expect(observed?.revision.value).toBe(1);

    await boundary.execute(() => memberships.update(observed!.aggregate, Revision.initial()));

    let failure: unknown;
    try {
      await boundary.execute(() => memberships.update(observed!.aggregate, Revision.initial()));
    } catch (error) {
      failure = error;
    }

    const conflict = toConflict(failure);
    expect(conflict).toBeInstanceOf(ConflictError);
    expect(conflict?.details[0]).toMatchObject({ code: 'STALE_REVISION', expected: 1 });
    expect((await memberships.get(id))?.revision.value).toBe(2);

    // A stale lifecycle command is reported as the conflict, too.
    const stale = await inTenant(tenant.id.value, () =>
      changeStatus.execute(
        new ChangeMembershipStatus({
          membershipId: created.id,
          tenantId: tenant.id.value,
          status: 'inactive',
          expectedRevision: 1,
        }),
      ),
    );
    expect(stale.isFail()).toBe(true);
    expect(stale.errorOrThrow()).toBeInstanceOf(ConflictError);
  });

  it('finds a user’s memberships and a tenant’s members from storage', async () => {
    const user = await seedUser();
    const other = await seedUser('sara@example.com');
    const first = await seedTenant('First Co.');
    const second = await seedTenant('Second Co.');

    const createUseCase = create();
    await inTenant(first.id.value, () =>
      createUseCase.execute(
        new CreateMembership({ userId: user.id.value, tenantId: first.id.value }),
      ),
    );
    await inTenant(second.id.value, () =>
      createUseCase.execute(
        new CreateMembership({ userId: user.id.value, tenantId: second.id.value }),
      ),
    );
    await inTenant(first.id.value, () =>
      createUseCase.execute(
        new CreateMembership({ userId: other.id.value, tenantId: first.id.value }),
      ),
    );

    const userMemberships = await new ListUserMembershipsUseCase(memberships, users).execute(
      new ListUserMemberships({ userId: user.id.value }),
    );
    expect(userMemberships.valueOrThrow()).toHaveLength(2);

    const tenantMembers = await inTenant(first.id.value, () =>
      new ListTenantMembersUseCase(memberships, users).execute(
        new ListTenantMembers({ tenantId: first.id.value }),
      ),
    );
    expect(tenantMembers.valueOrThrow()).toHaveLength(2);
    expect(
      tenantMembers
        .valueOrThrow()
        .map((member) => member.userId)
        .sort(),
    ).toEqual([user.id.value, other.id.value].sort());
  });
});
