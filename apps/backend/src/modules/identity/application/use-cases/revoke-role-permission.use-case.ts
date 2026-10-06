import { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { causedBy } from '../../../../shared/messaging/message.js';
import { toConflict } from '../../../../shared/persistence/optimistic-concurrency.js';
import type { WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { tenantScopedMessageOptions } from '../../../../shared/tenant/tenant-message-options.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { RoleNotFoundError } from '../../domain/errors/role.errors.js';
import { RolePermissionRevoked } from '../../domain/events/role.events.js';
import type { RoleRepository } from '../../domain/repositories/role.repository.js';
import { isRoleId, roleIdFrom } from '../../domain/value-objects/role-id.js';
import type { RevokeRolePermission } from '../commands/revoke-role-permission.command.js';
import type { RoleEventRecorder } from '../ports/role-event-recorder.port.js';
import { parsePermissionKey } from '../services/role-input.js';
import { parseExpectedRevision } from '../services/user-input.js';
import { resolveScopedTenant } from '../services/tenant-scope.js';
import { toRoleView } from '../views/role.mapper.js';
import type { RoleView } from '../views/role.view.js';

/**
 * Removes a capability from a Role (IAM-004).
 *
 * The key is validated for shape but not required to be a *known* capability:
 * removing a key the role no longer should hold must work even if the catalog
 * stopped advertising it, so revocation is never blocked by catalog drift.
 * Whether the role actually grants it is decided by the domain: `revokePermission`
 * refuses a key the role does not hold (`RolePermissionNotFoundError`), so a
 * no-op removal is reported rather than silently accepted, and an inactive role
 * refuses any change (`InactiveRoleError`).
 *
 * The write is a compare-and-swap on the revision the caller read (SHR-008).
 * Removing a permission takes effect immediately for effective-permission
 * resolution, which reads the role's *current* set.
 */
export class RevokeRolePermissionUseCase {
  public constructor(
    private readonly roles: RoleRepository,
    private readonly events: RoleEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: RevokeRolePermission): Promise<Result<RoleView, DomainError>> {
    const { roleId: rawId, tenantId: rawTenantId, expectedRevision } = command.payload;

    if (!isRoleId(rawId)) {
      return Result.fail(new RoleNotFoundError());
    }

    const permission = parsePermissionKey(command.payload.permissionKey);
    if (permission.isFail()) {
      return Result.fail(permission.errorOrThrow());
    }
    const key = permission.valueOrThrow();

    const revision = parseExpectedRevision(expectedRevision);
    if (revision.isFail()) {
      return Result.fail(revision.errorOrThrow());
    }

    const tenantId = resolveScopedTenant(rawTenantId);
    if (tenantId.isFail()) {
      return Result.fail(tenantId.errorOrThrow());
    }

    const id = roleIdFrom(rawId);
    const scopeTenant = tenantId.valueOrThrow().value;

    return this.boundary.execute<Result<RoleView, DomainError>>(async () => {
      const loaded = await this.roles.get(id);
      if (loaded === undefined || loaded.aggregate.tenantId.value !== scopeTenant) {
        return Result.fail(new RoleNotFoundError());
      }

      const role = loaded.aggregate;

      try {
        role.revokePermission(key, DateTime.now());
      } catch (error) {
        if (error instanceof DomainError) {
          return Result.fail(error);
        }
        throw error;
      }

      let receipt: WriteReceipt;
      try {
        receipt = await this.roles.update(role, Revision.of(revision.valueOrThrow()));
      } catch (error) {
        const conflict = toConflict(error);
        if (conflict !== undefined) {
          return Result.fail(conflict);
        }
        throw error;
      }

      await this.events.record(
        new RolePermissionRevoked(
          { roleId: role.roleId(), tenantId: role.tenantIdValue(), permission: key.value },
          tenantScopedMessageOptions(causedBy(command)),
        ),
      );

      return Result.ok(toRoleView({ aggregate: role, revision: receipt.revision }));
    });
  }
}
