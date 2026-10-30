import type { Result } from '../../shared/errors/result.js';
import { createTenantContext } from '../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../shared/tenant/tenant-scope.js';
import {
  businessDateFromJalali,
  businessDateFromMillis,
  businessDateToJalali,
  jalaliDaysInMonth,
} from '../../shared/time/jalali-calendar.js';
import type { AppConfigService } from '../../infrastructure/config/app-config.service.js';
import type { SeedRegistry } from '../../infrastructure/seed/seed-registry.port.js';
import { CreateFiscalYear } from '../../modules/accounting/application/commands/create-fiscal-year.command.js';
import type { CreateFiscalYearUseCase } from '../../modules/accounting/application/use-cases/create-fiscal-year.use-case.js';
import { AssignRoleToMembership } from '../../modules/identity/application/commands/assign-role-to-membership.command.js';
import { CreateMembership } from '../../modules/identity/application/commands/create-membership.command.js';
import { CreateRole } from '../../modules/identity/application/commands/create-role.command.js';
import { CreateUser } from '../../modules/identity/application/commands/create-user.command.js';
import { GrantRolePermission } from '../../modules/identity/application/commands/grant-role-permission.command.js';
import { SetUserCredential } from '../../modules/identity/application/commands/set-user-credential.command.js';
import type { UserDirectory } from '../../modules/identity/application/ports/user-directory.port.js';
import { ListMembershipRoles } from '../../modules/identity/application/queries/list-membership-roles.query.js';
import { ListRoles } from '../../modules/identity/application/queries/list-roles.query.js';
import { ListUserMemberships } from '../../modules/identity/application/queries/list-user-memberships.query.js';
import type { AssignRoleToMembershipUseCase } from '../../modules/identity/application/use-cases/assign-role-to-membership.use-case.js';
import type { BootstrapSystemAdminUseCase } from '../../modules/identity/application/use-cases/bootstrap-system-admin.use-case.js';
import type { CreateMembershipUseCase } from '../../modules/identity/application/use-cases/create-membership.use-case.js';
import type { CreateRoleUseCase } from '../../modules/identity/application/use-cases/create-role.use-case.js';
import type { CreateUserUseCase } from '../../modules/identity/application/use-cases/create-user.use-case.js';
import type { GrantRolePermissionUseCase } from '../../modules/identity/application/use-cases/grant-role-permission.use-case.js';
import type { ListMembershipRolesUseCase } from '../../modules/identity/application/use-cases/list-membership-roles.use-case.js';
import type { ListRolesUseCase } from '../../modules/identity/application/use-cases/list-roles.use-case.js';
import type { ListUserMembershipsUseCase } from '../../modules/identity/application/use-cases/list-user-memberships.use-case.js';
import type { SetUserCredentialUseCase } from '../../modules/identity/application/use-cases/set-user-credential.use-case.js';
import type { RoleView } from '../../modules/identity/application/views/role.view.js';
import {
  CreateTenant,
  type CreateTenantUseCase,
  type TenantDirectory,
} from '../../modules/tenant/public-api.js';
import {
  SEED_ROLES,
  SEED_TENANTS,
  SEED_USER_PASSWORD,
  type SeedTenantFixture,
  type SeedUserFixture,
} from './seed-dataset.js';

/** Whether one fixture was created by this run or already existed. */
export type SeedOutcome = 'created' | 'reused';

/** One fixture, as the run actually resolved it. */
export interface SeedReportEntry {
  readonly fixture: string;
  readonly outcome: SeedOutcome;
}

/** What one seed run did, for the command's summary. */
export interface SeedReport {
  readonly environment: string;
  readonly productOwner: SeedOutcome;
  readonly entries: readonly SeedReportEntry[];
  readonly created: number;
  readonly reused: number;
}

/**
 * The command was asked to run where seeding is not allowed (DEV-001).
 *
 * It is thrown *before* the first database access, so a production refusal can
 * never leave a partial dataset behind.
 */
export class SeedEnvironmentRefusedError extends Error {
  public constructor(environment: string) {
    super(
      `Refusing to seed the "${environment}" environment. Seeding is allowed only in ` +
        'development and test; nothing was written.',
    );
    this.name = 'SeedEnvironmentRefusedError';
  }
}

/** Every dependency the run composes; all of them are existing contracts. */
export interface SeedDependencies {
  readonly config: AppConfigService;
  readonly bootstrap: BootstrapSystemAdminUseCase;
  readonly users: UserDirectory;
  readonly createUser: CreateUserUseCase;
  readonly setCredential: SetUserCredentialUseCase;
  readonly createTenant: CreateTenantUseCase;
  readonly tenants: TenantDirectory;
  readonly createMembership: CreateMembershipUseCase;
  readonly listUserMemberships: ListUserMembershipsUseCase;
  readonly createRole: CreateRoleUseCase;
  readonly listRoles: ListRolesUseCase;
  readonly grantRolePermission: GrantRolePermissionUseCase;
  readonly assignRole: AssignRoleToMembershipUseCase;
  readonly listMembershipRoles: ListMembershipRolesUseCase;
  readonly createFiscalYear: CreateFiscalYearUseCase;
  readonly registry: SeedRegistry;
}

/**
 * Populates a development/test installation with the documented dataset
 * (DEV-001).
 *
 * Two rules shape the whole run:
 *
 * - **Reuse before create.** Every fixture is looked up through an application
 *   contract first (email for users, name for roles, memberships by user,
 *   fiscal years by label, the seed registry for tenants). A second run
 *   therefore changes nothing: it reuses what exists and reports it as reused.
 * - **Compose existing use cases.** The seeder owns no business rule and writes
 *   no table of its own except the fixture registry. A membership, a role or a
 *   fiscal year is created by the same use case an HTTP request would call, so
 *   validation, tenant isolation, transactions, audit and outbox events all
 *   apply exactly as they do in production.
 *
 * Tenant-scoped steps run inside `TenantScope.run`, because that is the trusted
 * boundary those use cases require; the tenant id comes from the record this run
 * just created or resolved, never from a client. Nothing here creates the
 * Product Owner twice, never resets a password, and nothing here is reachable
 * from application startup.
 */
export class DevelopmentSeedRunner {
  public constructor(private readonly deps: SeedDependencies) {}

  public async run(): Promise<SeedReport> {
    this.refuseForbiddenEnvironment();

    const registry = await this.deps.registry.load();
    const entries: SeedReportEntry[] = [];

    const productOwner = await this.ensureProductOwner();

    const userIds = new Map<string, string>();
    for (const tenantFixture of SEED_TENANTS) {
      for (const userFixture of tenantFixture.users) {
        userIds.set(userFixture.fixtureKey, await this.ensureUser(userFixture, entries));
      }
    }

    for (const tenantFixture of SEED_TENANTS) {
      await this.seedTenant(tenantFixture, userIds, registry, entries);
    }

    return {
      environment: this.deps.config.environment.name,
      productOwner,
      entries,
      created: entries.filter((entry) => entry.outcome === 'created').length,
      reused: entries.filter((entry) => entry.outcome === 'reused').length,
    };
  }

  /**
   * The environment restriction is a code rule, not a documented hope: it runs
   * before the registry is read, so a production run touches nothing at all.
   */
  private refuseForbiddenEnvironment(): void {
    const environment = this.deps.config.environment;
    if (environment.isDevelopment || environment.isTest) return;

    throw new SeedEnvironmentRefusedError(environment.name);
  }

  /**
   * The Product Owner is provisioned by the same idempotent bootstrap the API
   * runs, so seeding can never create a second privileged account and never
   * resets the existing one's password.
   */
  private async ensureProductOwner(): Promise<SeedOutcome> {
    const { systemAdmin } = this.deps.config;

    if (!systemAdmin.enabled) {
      throw new Error(
        'SYSTEM_ADMIN_ENABLED must be true to seed: the dataset reuses the configured ' +
          'Product Owner. Set SYSTEM_ADMIN_EMAIL and SYSTEM_ADMIN_PASSWORD, then retry.',
      );
    }

    const outcome = await this.deps.bootstrap.execute(systemAdmin);
    if (outcome === 'disabled') {
      throw new Error('Product Owner bootstrap is disabled; no dataset can be seeded.');
    }

    return outcome === 'created' ? 'created' : 'reused';
  }

  private async ensureUser(fixture: SeedUserFixture, entries: SeedReportEntry[]): Promise<string> {
    const existing = await this.deps.users.findByEmail(fixture.email);
    if (existing !== undefined) {
      if (existing.status !== 'active') {
        throw new Error(
          `Seeded user ${fixture.fixtureKey} exists but is not active; activate or remove it ` +
            'before seeding again.',
        );
      }
      entries.push({ fixture: fixture.fixtureKey, outcome: 'reused' });
      return existing.userId;
    }

    const created = this.unwrap(
      await this.deps.createUser.execute(
        new CreateUser({ displayName: fixture.displayName, email: fixture.email }),
      ),
      `create user ${fixture.fixtureKey}`,
    );

    this.unwrap(
      await this.deps.setCredential.execute(
        new SetUserCredential({ userId: created.id, password: SEED_USER_PASSWORD }),
      ),
      `set the credential of ${fixture.fixtureKey}`,
    );

    entries.push({ fixture: fixture.fixtureKey, outcome: 'created' });
    return created.id;
  }

  private async seedTenant(
    fixture: SeedTenantFixture,
    userIds: ReadonlyMap<string, string>,
    registry: ReadonlyMap<string, { readonly entityId: string }>,
    entries: SeedReportEntry[],
  ): Promise<void> {
    const owner = fixture.users[0];
    const ownerUserId = owner === undefined ? undefined : userIds.get(owner.fixtureKey);
    if (owner === undefined || ownerUserId === undefined) {
      throw new Error(`Seed fixture ${fixture.fixtureKey} declares no owner user.`);
    }

    const tenantId = await this.ensureTenant(fixture, ownerUserId, registry, entries);

    // Reading a person's memberships spans every tenant, so it is an explicit
    // system-level read and must run outside the tenant scope (IAM-003). Only
    // the writes below belong inside the company's boundary.
    const memberships = new Map<string, string>();
    const missing: { readonly fixture: SeedUserFixture; readonly userId: string }[] = [];

    for (const userFixture of fixture.users) {
      const userId = userIds.get(userFixture.fixtureKey);
      if (userId === undefined) {
        throw new Error(`Seed fixture ${userFixture.fixtureKey} was not provisioned.`);
      }

      const existing = await this.findMembership(userId, tenantId, userFixture);
      if (existing === undefined) {
        missing.push({ fixture: userFixture, userId });
      } else {
        memberships.set(userFixture.fixtureKey, existing);
        entries.push({ fixture: `membership:${userFixture.fixtureKey}`, outcome: 'reused' });
      }
    }

    await TenantScope.run(createTenantContext(tenantId), async () => {
      for (const pending of missing) {
        memberships.set(
          pending.fixture.fixtureKey,
          await this.ensureMembership(tenantId, pending.userId, pending.fixture, entries),
        );
      }

      const roles = await this.ensureRoles(tenantId, entries);

      for (const userFixture of fixture.users) {
        const membershipId = memberships.get(userFixture.fixtureKey);
        const role = roles.get(userFixture.roleKey);
        if (membershipId === undefined || role === undefined) {
          throw new Error(
            `Seed fixture ${fixture.fixtureKey} references an unknown role "${userFixture.roleKey}".`,
          );
        }
        await this.ensureAssignment(tenantId, membershipId, role, entries);
      }

      await this.ensureFiscalYear(tenantId, entries);
    });
  }

  /** Finds the tenant the registry recorded, or creates it and records it. */
  private async ensureTenant(
    fixture: SeedTenantFixture,
    ownerUserId: string,
    registry: ReadonlyMap<string, { readonly entityId: string }>,
    entries: SeedReportEntry[],
  ): Promise<string> {
    const recorded = registry.get(fixture.fixtureKey)?.entityId;
    if (recorded !== undefined && (await this.deps.tenants.exists(recorded))) {
      entries.push({ fixture: fixture.fixtureKey, outcome: 'reused' });
      return recorded;
    }

    const created = this.unwrap(
      await this.deps.createTenant.execute(new CreateTenant({ name: fixture.name, ownerUserId })),
      `create tenant ${fixture.fixtureKey}`,
    );

    await this.deps.registry.record({
      fixtureKey: fixture.fixtureKey,
      entityType: 'tenant',
      entityId: created.id,
    });

    entries.push({ fixture: fixture.fixtureKey, outcome: 'created' });
    return created.id;
  }

  /** The membership a user already holds in a tenant, read outside any scope. */
  private async findMembership(
    userId: string,
    tenantId: string,
    fixture: SeedUserFixture,
  ): Promise<string | undefined> {
    const current = this.unwrap(
      await this.deps.listUserMemberships.execute(new ListUserMemberships({ userId })),
      `read the memberships of ${fixture.fixtureKey}`,
    );

    return current.find((membership) => membership.tenantId === tenantId)?.id;
  }

  private async ensureMembership(
    tenantId: string,
    userId: string,
    fixture: SeedUserFixture,
    entries: SeedReportEntry[],
  ): Promise<string> {
    const created = this.unwrap(
      await this.deps.createMembership.execute(new CreateMembership({ userId, tenantId })),
      `add ${fixture.fixtureKey} to its company`,
    );

    entries.push({ fixture: `membership:${fixture.fixtureKey}`, outcome: 'created' });
    return created.id;
  }

  /** Creates the tenant's roles and tops up any permission they are missing. */
  private async ensureRoles(
    tenantId: string,
    entries: SeedReportEntry[],
  ): Promise<ReadonlyMap<string, RoleView>> {
    const listed = this.unwrap(
      await this.deps.listRoles.execute(new ListRoles({ tenantId })),
      'read the roles of a seeded company',
    );

    const existingByName = new Map(listed.map((role) => [role.name, role]));
    const resolved = new Map<string, RoleView>();

    for (const fixture of SEED_ROLES) {
      const existing = existingByName.get(fixture.name);
      let role = existing;

      if (role === undefined) {
        role = this.unwrap(
          await this.deps.createRole.execute(new CreateRole({ tenantId, name: fixture.name })),
          `create role ${fixture.name}`,
        );
        entries.push({ fixture: `role:${tenantId}:${fixture.fixtureKey}`, outcome: 'created' });
      } else {
        entries.push({ fixture: `role:${tenantId}:${fixture.fixtureKey}`, outcome: 'reused' });
      }

      for (const permission of fixture.permissions) {
        if (role.permissions.includes(permission)) continue;

        role = this.unwrap(
          await this.deps.grantRolePermission.execute(
            new GrantRolePermission({
              roleId: role.id,
              tenantId,
              permissionKey: permission,
              expectedRevision: role.revision,
            }),
          ),
          `grant ${permission} to ${fixture.name}`,
        );
        entries.push({
          fixture: `permission:${fixture.fixtureKey}:${permission}`,
          outcome: 'created',
        });
      }

      resolved.set(fixture.fixtureKey, role);
    }

    return resolved;
  }

  private async ensureAssignment(
    tenantId: string,
    membershipId: string,
    role: RoleView,
    entries: SeedReportEntry[],
  ): Promise<void> {
    const held = this.unwrap(
      await this.deps.listMembershipRoles.execute(
        new ListMembershipRoles({ tenantId, membershipId }),
      ),
      `read the roles of membership ${membershipId}`,
    );

    if (
      held.some((assignment) => assignment.roleId === role.id && assignment.status === 'active')
    ) {
      entries.push({ fixture: `assignment:${membershipId}:${role.id}`, outcome: 'reused' });
      return;
    }

    this.unwrap(
      await this.deps.assignRole.execute(
        new AssignRoleToMembership({ tenantId, membershipId, roleId: role.id }),
      ),
      `assign ${role.name} to membership ${membershipId}`,
    );

    entries.push({ fixture: `assignment:${membershipId}:${role.id}`, outcome: 'created' });
  }

  /**
   * Creates the current Jalali year for a tenant.
   *
   * The year is created through its own use case, which also generates the
   * twelve periods and selects the first open one — so the fixture is a valid
   * accounting frame, not a row the seeder invented. A duplicate label means the
   * year (and its periods) already exists, which is a reuse, not a failure.
   */
  private async ensureFiscalYear(tenantId: string, entries: SeedReportEntry[]): Promise<void> {
    const year = businessDateToJalali(businessDateFromMillis(Date.now())).jYear;
    const label = String(year);

    const outcome = await this.deps.createFiscalYear.execute(
      new CreateFiscalYear({
        label,
        startDate: businessDateFromJalali(year, 1, 1).toIsoString(),
        endDate: businessDateFromJalali(year, 12, jalaliDaysInMonth(year, 12)).toIsoString(),
      }),
    );

    if (outcome.isFail()) {
      const error = outcome.errorOrThrow();
      if (error.code === 'FISCAL_YEAR_LABEL_DUPLICATE') {
        entries.push({ fixture: `fiscal-year:${tenantId}:${label}`, outcome: 'reused' });
        return;
      }

      throw new Error(
        `Could not create the ${label} fiscal year of company ${tenantId}: ${error.code} — ` +
          error.message,
      );
    }

    entries.push({ fixture: `fiscal-year:${tenantId}:${label}`, outcome: 'created' });
  }

  /** Turns an expected `Result` failure into an actionable run failure. */
  private unwrap<T, E extends { code: string; message: string }>(
    outcome: Result<T, E>,
    operation: string,
  ): T {
    if (outcome.isFail()) {
      const error = outcome.errorOrThrow();
      throw new Error(`Seeding could not ${operation}: ${error.code} — ${error.message}`);
    }

    return outcome.valueOrThrow();
  }
}
