import { GetTenant } from '../src/modules/tenant/application/queries/get-tenant.query.js';
import { UpdateTenant } from '../src/modules/tenant/application/commands/update-tenant.command.js';
import { GetTenantUseCase } from '../src/modules/tenant/application/use-cases/get-tenant.use-case.js';
import { UpdateTenantUseCase } from '../src/modules/tenant/application/use-cases/update-tenant.use-case.js';
import type { TenantId } from '../src/modules/tenant/domain/value-objects/tenant-id.js';
import { tenantIdFrom } from '../src/modules/tenant/domain/value-objects/tenant-id.js';
import { createTenantContext } from '../src/shared/tenant/tenant-context.js';
import { TenantScope } from '../src/shared/tenant/tenant-scope.js';
import { TenantContextMissingError } from '../src/shared/tenant/tenant.errors.js';
import {
  InMemoryTenantRepository,
  aTenant,
  PassthroughTransactionBoundary,
  RecordingTenantEvents,
} from './support/tenant-doubles.js';
import {
  registerTenantIsolationSuite,
  type TenantIsolationCall,
  type TenantIsolationOutcome,
} from './support/tenant-isolation-contract.js';

interface TenantActor {
  readonly tenantId: string;
}

interface TenantRecord {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly revision: number;
}

interface TenantFixtureState {
  readonly repository: InMemoryTenantRepository;
  readonly getTenant: GetTenantUseCase;
  readonly updateTenant: UpdateTenantUseCase;
}

function recordFor(
  repository: InMemoryTenantRepository,
  id: string,
): TenantRecord | undefined {
  const tenantId: TenantId = tenantIdFrom(id);
  const aggregate = repository.stored(tenantId);
  const revision = repository.revisionOf(tenantId);
  if (aggregate === undefined || revision === undefined) return undefined;

  return {
    id: aggregate.id.value,
    name: aggregate.name.value,
    status: aggregate.status.value,
    revision: revision.value,
  };
}

async function inScope<T>(tenantId: string | undefined, work: () => Promise<T>): Promise<T> {
  if (tenantId === undefined) return work();
  return TenantScope.run(createTenantContext(tenantId), work);
}

async function read(
  fixture: TenantFixtureState,
  call: TenantIsolationCall<TenantActor>,
  id: string,
): Promise<TenantIsolationOutcome<TenantRecord>> {
  try {
    // The trusted actor establishes the scope; the route id is an untrusted claim.
    const scopeTenantId = call.routeTenantId === undefined ? undefined : call.actor.tenantId;
    const result = await inScope(scopeTenantId, () =>
      fixture.getTenant.execute(new GetTenant({ tenantId: id })),
    );
    if (result.isFail()) return { allowed: false, reason: result.errorOrThrow().message };
    const value = result.valueOrThrow();
    return {
      allowed: true,
      value: {
        id: value.id,
        name: value.name,
        status: value.status,
        revision: value.revision,
      },
    };
  } catch (error) {
    if (error instanceof TenantContextMissingError) return { allowed: false };
    throw error;
  }
}

const fixtureState = new Map<string, TenantFixtureState>();

registerTenantIsolationSuite<TenantActor, TenantRecord>({
  name: 'Tenant module',
  createFixture: async () => {
    const repository = new InMemoryTenantRepository();
    const tenantA = aTenant('Tenant A contract fixture');
    const tenantB = aTenant('Tenant B contract fixture');
    repository.seed(tenantA);
    repository.seed(tenantB);

    const events = new RecordingTenantEvents();
    const boundary = new PassthroughTransactionBoundary();
    const state: TenantFixtureState = {
      repository,
      getTenant: new GetTenantUseCase(repository),
      updateTenant: new UpdateTenantUseCase(repository, events, boundary),
    };
    const recordA = recordFor(repository, tenantA.id.value);
    const recordB = recordFor(repository, tenantB.id.value);
    if (recordA === undefined || recordB === undefined) {
      throw new Error('Tenant isolation fixture could not seed both tenant records.');
    }

    fixtureState.set(recordA.id, state);
    fixtureState.set(recordB.id, state);

    return {
      tenantA: {
        id: tenantA.id.value,
        actor: { tenantId: tenantA.id.value },
        record: recordA,
      },
      tenantB: {
        id: tenantB.id.value,
        actor: { tenantId: tenantB.id.value },
        record: recordB,
      },
    };
  },
  idOf: (record) => record.id,
  // The tenants table is the root registry: the row's identity itself is its boundary.
  tenantIdOf: (record) => record.id,
  supportsSwappedIdentifiers: false,
  snapshot: async (_fixture, record) => {
    const state = fixtureState.get(record.id);
    return state === undefined ? undefined : recordFor(state.repository, record.id);
  },
  readById: async (_fixture, call, recordId) => {
    // The fixture's per-record state is found from either record id; the same repository
    // contains both company rows, just as the real tenant registry does.
    const state = fixtureState.get(recordId);
    if (state === undefined) throw new Error('Missing tenant test state.');
    return read(state, call, recordId);
  },
  updateById: async (_fixture, call, recordId, foreignRecord) => {
    const state = fixtureState.get(foreignRecord.id);
    if (state === undefined) throw new Error('Missing tenant test state.');
    try {
      const scopeTenantId = call.routeTenantId === undefined ? undefined : call.actor.tenantId;
      const result = await inScope(scopeTenantId, () =>
        state.updateTenant.execute(
          new UpdateTenant({
            tenantId: recordId,
            name: 'Cross-tenant mutation attempt',
            expectedRevision: foreignRecord.revision,
          }),
        ),
      );
      return result.isOk() ? { allowed: true, value: result.valueOrThrow() } : { allowed: false };
    } catch (error) {
      if (error instanceof TenantContextMissingError) return { allowed: false };
      throw error;
    }
  },
  dispose: async (fixture) => {
    fixtureState.delete(fixture.tenantA.id);
    fixtureState.delete(fixture.tenantB.id);
  },
});
