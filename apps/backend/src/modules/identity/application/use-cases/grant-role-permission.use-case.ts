import { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { causedBy } from '../../../../shared/messaging/message.js';
import { toConflict } from '../../../../shared/persistence/optimistic-concurrency.js';
import type { WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { tenantScopedMessageOptions } from '../../../../shared/tenant/tenant-message-options.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { RoleNotFoundError, UnknownPermissionError } from '../../domain/errors/role.errors.js';
import { RolePermissionGranted } from '../../domain/events/role.events.js';
import { isKnownPermission } from '../../domain/permission.js';
import type { RoleRepository } from '../../domain/repositories/role.repository.js';
import { isRoleId, roleIdFrom } from '../../domain/value-objects/role-id.js';
import type { GrantRolePermission } from '../commands/grant-role-permission.command.js';
import type { RoleEventRecorder } from '../ports/role-event-recorder.port.js';
import { parsePermissionKey } from '../services/role-input.js';
import { resolveScopedTenant } from '../services/tenant-scope.js';
import { parseExpectedRevision } from '../services/user-input.js';
import { toRoleView } from '../views/role.mapper.js';
import type { RoleView } from '../views/role.view.js';

/**
 * Adds a capability to a Role (IAM-004).
 *
 * The key must name a capability the catalog defines (`UnknownPermissionError`
 * otherwise), which is what keeps a role's permission set meaningful and its
 * effective permissions resolvable. Whether the role already grants it is decided
 * by the *domain*: `grantPermission` refuses a duplicate with
 * `DuplicateRolePermissionError`, so the same capability can never be counted
 * twice, and an inactive role refuses any change (`InactiveRoleError`).
 *
 * The write is a compare-and-swap on the revision the caller read (SHR-008): a
 * concurrent permission change is reported as a conflict instead of silently
 * overwriting the winner.
 */
export class GrantRolePermissionUseCase {
  public constructor(
    private readonly roles: RoleRepository,
    private readonly events: RoleEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: GrantRolePermission): Promise<Result<RoleView, DomainError>> {
    const { roleId: rawId, tenantId: rawTenantId, expectedRevision } = command.payload;

    if (!isRoleId(rawId)) {
      return Result.fail(new RoleNotFoundError());
    }

    const permission = parsePermissionKey(command.payload.permissionKey);
    if (permission.isFail()) {
      return Result.fail(permission.errorOrThrow());
    }
    const key = permission.valueOrThrow();
    if (!isKnownPermission(key)) {
      return Result.fail(new UnknownPermissionError(key.value));
    }

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
        role.grantPermission(key, DateTime.now());
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
        new RolePermissionGranted(
          { roleId: role.roleId(), tenantId: role.tenantIdValue(), permission: key.value },
          tenantScopedMessageOptions(causedBy(command)),
        ),
      );

      return Result.ok(toRoleView({ aggregate: role, revision: receipt.revision }));
    });
  }
}
