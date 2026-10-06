import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import type { RoleRepository } from '../../domain/repositories/role.repository.js';
import type { ListRoles } from '../queries/list-roles.query.js';
import { resolveScopedTenant } from '../services/tenant-scope.js';
import { toRoleView } from '../views/role.mapper.js';
import type { RoleView } from '../views/role.view.js';

/**
 * Reads the roles of one Tenant (IAM-004).
 *
 * The read is tenant-scoped: the tenant is resolved from the ambient tenant
 * scope and checked against the requested one, so it cannot bypass the tenant
 * boundary and browse another tenant's roles.
 */
export class ListRolesUseCase {
  public constructor(private readonly roles: RoleRepository) {}

  public async execute(query: ListRoles): Promise<Result<readonly RoleView[], DomainError>> {
    const tenantId = resolveScopedTenant(query.params.tenantId);
    if (tenantId.isFail()) {
      return Result.fail(tenantId.errorOrThrow());
    }

    const loaded = await this.roles.findByTenantId(tenantId.valueOrThrow());

    return Result.ok(loaded.map(toRoleView));
  }
}
