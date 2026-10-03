import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import type { TenantRepository } from '../../domain/repositories/tenant.repository.js';
import { tenantNotFound, resolveScopedTenantId } from '../services/tenant-scope.js';
import { toTenantView } from '../views/tenant.mapper.js';
import type { TenantView } from '../views/tenant.view.js';
import type { GetTenant } from '../queries/get-tenant.query.js';

/**
 * Reads one tenant (IAM-001).
 *
 * A query: it changes nothing, opens no transaction and records no event. It is
 * still tenant-scoped — the tenant it may read is the tenant of the current
 * tenant context — so a caller cannot read another tenant's data by supplying
 * an id (ADR-003 section 24).
 */
export class GetTenantUseCase {
  public constructor(private readonly repository: TenantRepository) {}

  public async execute(query: GetTenant): Promise<Result<TenantView, DomainError>> {
    const resolved = resolveScopedTenantId(query.params.tenantId);
    if (resolved.isFail()) {
      return Result.fail(resolved.errorOrThrow());
    }

    const loaded = await this.repository.get(resolved.valueOrThrow());
    if (loaded === undefined) {
      return Result.fail(tenantNotFound());
    }

    return Result.ok(toTenantView(loaded));
  }
}
