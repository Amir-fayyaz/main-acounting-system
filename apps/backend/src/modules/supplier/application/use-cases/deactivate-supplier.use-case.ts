import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { ConflictError } from '../../../../shared/errors/category-errors.js';
import { Result } from '../../../../shared/errors/result.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { ActorScope } from '../../../../shared/actor/actor-scope.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import type { AuditRecorder } from '../../../audit/application/ports/audit-recorder.port.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import {
  isConcurrencyConflict,
  staleRevisionConflict,
  toConflict,
} from '../../../../shared/persistence/optimistic-concurrency.js';
import { isSupplierId, supplierIdFrom } from '../../domain/value-objects/supplier-id.js';
import { SupplierNotFoundError } from '../../domain/errors/supplier.errors.js';
import type { SupplierRepository } from '../../domain/repositories/supplier.repository.js';
import type { DeactivateSupplierCommand } from '../commands/supplier.commands.js';
import type { SupplierAuthorizationPort } from '../ports/supplier-authorization.port.js';
import { toSupplierView, type SupplierView } from '../views/supplier.view.js';

export class DeactivateSupplierUseCase {
  public constructor(
    private readonly repository: SupplierRepository,
    private readonly authorization: SupplierAuthorizationPort,
    private readonly audit: AuditRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(
    command: DeactivateSupplierCommand,
  ): Promise<Result<SupplierView, DomainError>> {
    const tenantId = TenantScope.requireTenantId();
    const actorUserId = ActorScope.current()?.userId ?? command.payload.principal?.userId;

    // Role check: writes without permission are refused and audited (B-03)
    const authOutcome = await this.authorization.authorizeWrite(
      tenantId,
      command.payload.principal,
    );
    if (authOutcome.isFail()) {
      await this.audit.record({
        action: 'supplier.deactivate',
        outcome: 'denied',
        actorUserId,
        target: { type: 'supplier', id: command.payload.id },
      });
      return Result.fail(authOutcome.errorOrThrow());
    }

    if (!isSupplierId(command.payload.id)) {
      return Result.fail(new SupplierNotFoundError(command.payload.id));
    }

    return this.boundary.execute<Result<SupplierView, DomainError>>(async () => {
      const id = supplierIdFrom(command.payload.id);
      const loaded = await this.repository.get(id);
      if (loaded === undefined || loaded.aggregate.tenantId !== tenantId) {
        return Result.fail(new SupplierNotFoundError(command.payload.id));
      }

      const supplier = loaded.aggregate;
      const expectedRevision = Revision.of(command.payload.expectedRevision);

      if (!loaded.revision.equals(expectedRevision)) {
        const conflict = staleRevisionConflict(
          'Supplier.deactivate',
          expectedRevision,
          loaded.revision,
        );
        return Result.fail(conflict.toDomainError() ?? new ConflictError('Stale revision.'));
      }

      const now = DateTime.now();
      const deactOutcome = supplier.deactivate(now);
      if (deactOutcome.isFail()) {
        return Result.fail(deactOutcome.errorOrThrow());
      }

      try {
        const receipt = await this.repository.update(supplier, expectedRevision);

        await this.audit.record({
          action: 'supplier.deactivate',
          outcome: 'success',
          actorUserId,
          target: { type: 'supplier', id: supplier.id.value },
        });

        return Result.ok(toSupplierView(supplier, receipt.revision.value));
      } catch (error) {
        if (isConcurrencyConflict(error)) {
          const conflict = toConflict(error);
          if (conflict) {
            return Result.fail(conflict);
          }
        }
        throw error;
      }
    });
  }
}
