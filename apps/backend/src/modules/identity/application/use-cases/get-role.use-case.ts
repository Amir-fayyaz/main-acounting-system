import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { RoleNotFoundError } from '../../domain/errors/role.errors.js';
import type { RoleRepository } from '../../domain/repositories/role.repository.js';
import { isRoleId, roleIdFrom } from '../../domain/value-objects/role-id.js';
import type { GetRole } from '../queries/get-role.query.js';
import { resolveScopedTenant } from '../services/tenant-scope.js';
import { toRoleView } from '../views/role.mapper.js';
import type { RoleView } from '../views/role.view.js';

/**
 * Reads one Role by id within the caller's tenant (IAM-004).
 *
 * A query: it changes nothing, opens no transaction and records no event. It is
 * tenant-scoped — the role must belong to the tenant of the current tenant
 * context — so a caller cannot read another tenant's role by supplying an id. A
 * malformed id and an unknown one are answered the same way, so the read
 * discloses nothing about which ids exist.
 */
export class GetRoleUseCase {
  public constructor(private readonly roles: RoleRepository) {}

  public async execute(query: GetRole): Promise<Result<RoleView, DomainError>> {
    const rawId = query.params.roleId;
    if (!isRoleId(rawId)) {
      return Result.fail(new RoleNotFoundError());
    }

    const tenantId = resolveScopedTenant(query.params.tenantId);
    if (tenantId.isFail()) {
      return Result.fail(tenantId.errorOrThrow());
    }

    const loaded = await this.roles.get(roleIdFrom(rawId));
    if (loaded === undefined || loaded.aggregate.tenantId.value !== tenantId.valueOrThrow().value) {
      return Result.fail(new RoleNotFoundError());
    }

    return Result.ok(toRoleView(loaded));
  }
}
