import { GetRole } from '../src/modules/identity/application/queries/get-role.query.js';
import { ListRoles } from '../src/modules/identity/application/queries/list-roles.query.js';
import { GetRoleUseCase } from '../src/modules/identity/application/use-cases/get-role.use-case.js';
import { ListRolesUseCase } from '../src/modules/identity/application/use-cases/list-roles.use-case.js';
import { Role } from '../src/modules/identity/domain/aggregates/role.js';
import { RoleName } from '../src/modules/identity/domain/value-objects/role-name.js';
import { roleIdFrom } from '../src/modules/identity/domain/value-objects/role-id.js';
import { tenantReferenceFrom } from '../src/modules/identity/domain/value-objects/tenant-reference.js';
import { createTenantContext } from '../src/shared/tenant/tenant-context.js';
import { TenantContextMissingError } from '../src/shared/tenant/tenant.errors.js';
import { TenantScope } from '../src/shared/tenant/tenant-scope.js';
import { FIXED_NOW, InMemoryRoleRepository } from './support/role-doubles.js';
import { aTenant } from './support/tenant-doubles.js';
import {
  registerTenantIsolationSuite,
  type TenantIsolationCall,
  type TenantIsolationOutcome,
} from './support/tenant-isolation-contract.js';

interface RoleActor {
  readonly tenantId: string;
}

interface RoleRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly status: string;
  readonly permissions: readonly string[];
}

interface RoleFixtureState {
  readonly repository: InMemoryRoleRepository;
  readonly getRole: GetRoleUseCase;
  readonly listRoles: ListRolesUseCase;
}

const states = new WeakMap<object, RoleFixtureState>();

function toRecord(role: Role): RoleRecord {
  const snapshot = role.snapshot();

  return {
    id: snapshot.id,
    tenantId: snapshot.tenantId,
    name: snapshot.name,
    status: snapshot.status,
    permissions: snapshot.permissions,
  };
}

function denied<T>(reason?: string): TenantIsolationOutcome<T> {
  return {
    allowed: false,
    ...(reason === undefined ? {} : { reason }),
  };
}

async function inScope<T>(
  call: TenantIsolationCall<RoleActor>,
  work: () => Promise<T>,
): Promise<T> {
  if (call.routeTenantId === undefined) {
    return work();
  }

  // The actor determines the trusted scope.
  // The route tenant is separately checked by the use case.
  return TenantScope.run(createTenantContext(call.actor.tenantId), work);
}

registerTenantIsolationSuite<RoleActor, RoleRecord>({
  name: 'Role entity',

  createFixture: async () => {
    const tenantA = aTenant('Tenant A');
    const tenantB = aTenant('Tenant B');
    const repository = new InMemoryRoleRepository();

    const roleA = Role.create({
      tenantId: tenantReferenceFrom(tenantA.id.value),
      name: RoleName.from('Role A'),
      now: FIXED_NOW,
    });

    const roleB = Role.create({
      tenantId: tenantReferenceFrom(tenantB.id.value),
      name: RoleName.from('Role B'),
      now: FIXED_NOW,
    });

    repository.seed(roleA);
    repository.seed(roleB);

    const fixture = {
      tenantA: {
        id: tenantA.id.value,
        actor: { tenantId: tenantA.id.value },
        record: toRecord(roleA),
      },
      tenantB: {
        id: tenantB.id.value,
        actor: { tenantId: tenantB.id.value },
        record: toRecord(roleB),
      },
    };

    states.set(fixture, {
      repository,
      getRole: new GetRoleUseCase(repository),
      listRoles: new ListRolesUseCase(repository),
    });

    return fixture;
  },

  idOf: (record) => record.id,
  tenantIdOf: (record) => record.tenantId,

  snapshot: async (fixture, record) => {
    const state = states.get(fixture);

    if (state === undefined) {
      throw new Error('Role isolation fixture was not registered.');
    }

    const stored = state.repository.stored(roleIdFrom(record.id));

    return stored === undefined ? undefined : toRecord(stored);
  },

  readById: async (fixture, call, recordId) => {
    const state = states.get(fixture);

    if (state === undefined) {
      throw new Error('Role isolation fixture was not registered.');
    }

    try {
      const result = await inScope(call, () =>
        state.getRole.execute(
          new GetRole({
            roleId: recordId,
            tenantId: call.routeTenantId ?? call.actor.tenantId,
          }),
        ),
      );

      if (result.isFail()) {
        return denied(result.errorOrThrow().message);
      }

      const view = result.valueOrThrow();

      return {
        allowed: true,
        value: {
          id: view.id,
          tenantId: view.tenantId,
          name: view.name,
          status: view.status,
          permissions: view.permissions,
        },
      };
    } catch (error) {
      if (error instanceof TenantContextMissingError) {
        return denied(error.message);
      }

      throw error;
    }
  },

  list: async (fixture, call) => {
    const state = states.get(fixture);

    if (state === undefined) {
      throw new Error('Role isolation fixture was not registered.');
    }

    try {
      const result = await inScope(call, () =>
        state.listRoles.execute(
          new ListRoles({
            tenantId: call.routeTenantId ?? call.actor.tenantId,
          }),
        ),
      );

      if (result.isFail()) {
        return denied(result.errorOrThrow().message);
      }

      return {
        allowed: true,
        value: result.valueOrThrow().map((view) => ({
          id: view.id,
          tenantId: view.tenantId,
          name: view.name,
          status: view.status,
          permissions: view.permissions,
        })),
      };
    } catch (error) {
      if (error instanceof TenantContextMissingError) {
        return denied(error.message);
      }

      throw error;
    }
  },

  dispose: async (fixture) => {
    states.delete(fixture);
  },
});
