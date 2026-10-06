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
import { RoleRenamed } from '../../domain/events/role.events.js';
import type { RoleRepository } from '../../domain/repositories/role.repository.js';
import { isRoleId, roleIdFrom } from '../../domain/value-objects/role-id.js';
import type { UpdateRole } from '../commands/update-role.command.js';
import type { RoleEventRecorder } from '../ports/role-event-recorder.port.js';
import { parseRoleName } from '../services/role-input.js';
import { parseExpectedRevision } from '../services/user-input.js';
import { resolveScopedTenant } from '../services/tenant-scope.js';
import { toRoleView } from '../views/role.mapper.js';
import type { RoleView } from '../views/role.view.js';

/**
 * Renames a Role (IAM-004).
 *
 * The write is protected end to end by the shared optimistic-concurrency
 * mechanism: the command carries the revision the caller read, the repository
 * refuses the write if the record moved, and the lost race becomes the shared
 * `ConflictError`. Before mutating, the use case validates the *current role
 * state*: an inactive role refuses the change (`InactiveRoleError`). When the
 * name is unchanged the write is skipped, so the revision does not advance for a
 * no-op.
 */
export class UpdateRoleUseCase {
  public constructor(
    private readonly roles: RoleRepository,
    private readonly events: RoleEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: UpdateRole): Promise<Result<RoleView, DomainError>> {
    const { roleId: rawId, tenantId: rawTenantId, expectedRevision } = command.payload;

    if (!isRoleId(rawId)) {
      return Result.fail(new RoleNotFoundError());
    }

    const name = parseRoleName(command.payload.name);
    if (name.isFail()) {
      return Result.fail(name.errorOrThrow());
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
    const nextName = name.valueOrThrow();

    return this.boundary.execute<Result<RoleView, DomainError>>(async () => {
      const loaded = await this.roles.get(id);
      if (loaded === undefined || loaded.aggregate.tenantId.value !== scopeTenant) {
        return Result.fail(new RoleNotFoundError());
      }

      const role = loaded.aggregate;

      if (role.name.equals(nextName)) {
        return Result.ok(toRoleView({ aggregate: role, revision: loaded.revision }));
      }

      try {
        role.rename(nextName, DateTime.now());
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
        new RoleRenamed(
          { roleId: role.roleId(), tenantId: role.tenantIdValue(), name: role.name.value },
          tenantScopedMessageOptions(causedBy(command)),
        ),
      );

      return Result.ok(toRoleView({ aggregate: role, revision: receipt.revision }));
    });
  }
}
