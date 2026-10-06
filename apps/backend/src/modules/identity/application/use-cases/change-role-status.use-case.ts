import { ValidationError } from '../../../../shared/errors/category-errors.js';
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
import { RoleStatusChanged } from '../../domain/events/role.events.js';
import type { RoleRepository } from '../../domain/repositories/role.repository.js';
import { isRoleId, roleIdFrom } from '../../domain/value-objects/role-id.js';
import { RoleStatus } from '../../domain/value-objects/role-status.js';
import type { ChangeRoleStatus } from '../commands/change-role-status.command.js';
import type { RoleEventRecorder } from '../ports/role-event-recorder.port.js';
import { parseExpectedRevision } from '../services/user-input.js';
import { resolveScopedTenant } from '../services/tenant-scope.js';
import { toRoleView } from '../views/role.mapper.js';
import type { RoleView } from '../views/role.view.js';

/**
 * Moves a Role along its lifecycle (IAM-004).
 *
 * The requested move is decided by the *domain*, not here: the aggregate's
 * `activate`/`deactivate` methods refuse a transition that does not apply from
 * the current state, and a refusal becomes a normal `Result` failure. A
 * successful move is written against the revision the caller read and raises
 * `RoleStatusChanged` in the same transaction.
 *
 * Deactivation changes the role's state and nothing else: every assignment that
 * points at the role is retained, so the access history survives and
 * re-activating the role restores its effect.
 */
export class ChangeRoleStatusUseCase {
  public constructor(
    private readonly roles: RoleRepository,
    private readonly events: RoleEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: ChangeRoleStatus): Promise<Result<RoleView, DomainError>> {
    const {
      roleId: rawId,
      tenantId: rawTenantId,
      status: rawStatus,
      expectedRevision,
    } = command.payload;

    if (!isRoleId(rawId)) {
      return Result.fail(new RoleNotFoundError());
    }

    if (!RoleStatus.is(rawStatus)) {
      return Result.fail(
        new ValidationError('The role status is invalid.', [
          {
            code: 'ROLE_STATUS_INVALID',
            field: 'status',
            message: 'status must be "active" or "inactive"',
          },
        ]),
      );
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
    const target = RoleStatus.from(rawStatus);
    const scopeTenant = tenantId.valueOrThrow().value;

    return this.boundary.execute<Result<RoleView, DomainError>>(async () => {
      const loaded = await this.roles.get(id);
      if (loaded === undefined || loaded.aggregate.tenantId.value !== scopeTenant) {
        return Result.fail(new RoleNotFoundError());
      }

      const role = loaded.aggregate;
      const from = role.status.value;

      try {
        if (target.isActive()) {
          role.activate(DateTime.now());
        } else {
          role.deactivate(DateTime.now());
        }
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
        new RoleStatusChanged(
          {
            roleId: role.roleId(),
            tenantId: role.tenantIdValue(),
            from,
            to: role.status.value,
          },
          tenantScopedMessageOptions(causedBy(command)),
        ),
      );

      return Result.ok(toRoleView({ aggregate: role, revision: receipt.revision }));
    });
  }
}
