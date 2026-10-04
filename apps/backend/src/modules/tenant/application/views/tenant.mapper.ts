import type { Loaded } from '../../../../shared/persistence/repository-ports.js';
import type { Tenant } from '../../domain/aggregates/tenant.js';
import type { TenantView } from './tenant.view.js';

/**
 * Maps loaded domain state to the application view (IAM-001).
 *
 * The mapping is one-way and total: it reads the aggregate and its revision and
 * produces plain values. Nothing here can write back into the aggregate, and a
 * caller that wants to change something must go through a use case.
 */
export function toTenantView(loaded: Loaded<Tenant>): TenantView {
  const { aggregate: tenant, revision } = loaded;

  return {
    id: tenant.id.value,
    name: tenant.name.value,
    status: tenant.status.value,
    revision: revision.value,
    createdAt: tenant.createdAt.toIsoString(),
    updatedAt: tenant.updatedAt.toIsoString(),
  };
}
