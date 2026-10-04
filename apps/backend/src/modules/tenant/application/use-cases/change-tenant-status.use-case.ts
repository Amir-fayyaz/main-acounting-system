import { ValidationError } from '../../../../shared/errors/category-errors.js';
import { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { toConflict } from '../../../../shared/persistence/optimistic-concurrency.js';
import type { WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { tenantScopedMessageOptions } from '../../../../shared/tenant/tenant-message-options.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { TenantStatus } from '../../domain/value-objects/tenant-status.js';
import { TenantStatusChanged } from '../../domain/events/tenant.events.js';
import type { TenantRepository } from '../../domain/repositories/tenant.repository.js';
import type { ChangeTenantStatus } from '../commands/change-tenant-status.command.js';
import { tenantNotFound, resolveScopedTenantId } from '../services/tenant-scope.js';
import { toTenantView } from '../views/tenant.mapper.js';
import type { TenantEventRecorder } from '../ports/tenant-event-recorder.port.js';
import type { TenantView } from '../views/tenant.view.js';

/**
 * Moves a tenant along its lifecycle (IAM-001).
 *
 * The requested move is decided by the *domain*, not here: the aggregate's
 * `activate`/`deactivate` methods refuse a transition that does not apply from
 * the current state (`InvalidTenantStatusTransitionError`), and a refusal
 * becomes a normal `Result` failure. A successful move is written against the
 * revision the caller read, exactly like a profile update, and raises
 * `TenantStatusChanged` in the same transaction.
 *
 * No suspension, billing or deletion workflow exists here: the move is only
 * between the two states the current product model defines.
 */
export class ChangeTenantStatusUseCase {
  public constructor(
    private readonly repository: TenantRepository,
    private readonly events: TenantEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: ChangeTenantStatus): Promise<Result<TenantView, DomainError>> {
    const { tenantId: rawId, status: rawStatus, expectedRevision } = command.payload;

    const tenantId = resolveScopedTenantId(rawId);
    if (tenantId.isFail()) {
      return Result.fail(tenantId.errorOrThrow());
    }

    if (!TenantStatus.is(rawStatus)) {
      return Result.fail(
        new ValidationError('The tenant status is invalid.', [
          {
            code: 'TENANT_STATUS_INVALID',
            field: 'status',
            message: 'status must be "active" or "inactive"',
          },
        ]),
      );
    }
    const target = TenantStatus.from(rawStatus);
    const id = tenantId.valueOrThrow();

    return this.boundary.execute<Result<TenantView, DomainError>>(async () => {
      const loaded = await this.repository.get(id);
      if (loaded === undefined) {
        return Result.fail(tenantNotFound());
      }

      const tenant = loaded.aggregate;
      const from = tenant.status.value;

      try {
        if (target.isActive()) {
          tenant.activate(DateTime.now());
        } else {
          tenant.deactivate(DateTime.now());
        }
      } catch (error) {
        if (error instanceof DomainError) {
          return Result.fail(error);
        }
        throw error;
      }

      let receipt: WriteReceipt;
      try {
        receipt = await this.repository.update(tenant, Revision.of(expectedRevision));
      } catch (error) {
        const conflict = toConflict(error);
        if (conflict !== undefined) {
          return Result.fail(conflict);
        }
        throw error;
      }

      await this.events.record(
        new TenantStatusChanged(
          { tenantId: tenant.tenantId(), from, to: tenant.status.value },
          tenantScopedMessageOptions(),
        ),
      );

      return Result.ok(toTenantView({ aggregate: tenant, revision: receipt.revision }));
    });
  }
}
