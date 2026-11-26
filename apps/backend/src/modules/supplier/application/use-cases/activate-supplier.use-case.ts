import { ActorScope } from '../../../../shared/actor/actor-scope.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import {
  staleRevisionConflict,
  toConflict,
} from '../../../../shared/persistence/optimistic-concurrency.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import type { AuditRecorder } from '../../../audit/application/ports/audit-recorder.port.js';
import { SupplierNotFoundError } from '../../domain/errors/supplier.errors.js';
import { isSupplierId, supplierIdFrom } from '../../domain/value-objects/supplier-id.js';
import type { ActivateSupplierCommand } from '../commands/supplier.commands.js';
import type { SupplierAuthorizationPort } from '../ports/supplier-authorization.port.js';
import type { SupplierRepository } from '../ports/supplier-repository.port.js';
import { toSupplierView, type SupplierView } from '../views/supplier.view.js';

export class ActivateSupplierUseCase {
  public constructor(
    private readonly repository: SupplierRepository,
    private readonly authorization: SupplierAuthorizationPort,
    private readonly audit: AuditRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(
    command: ActivateSupplierCommand,
  ): Promise<Result<SupplierView, DomainError>> {
    const tenantId = TenantScope.requireTenantId();
    const actorUserId = ActorScope.current()?.userId ?? command.payload.principal?.userId;

    const authOutcome = await this.authorization.authorizeWrite(
      tenantId,
      command.payload.principal,
    );
    if (authOutcome.isFail()) {
      await this.audit.record({
        action: 'supplier.activate',
        outcome: 'denied',
        actorUserId,
        target: { type: 'supplier', id: command.payload.id },
      });
      return Result.fail(authOutcome.errorOrThrow());
    }

    return this.boundary.execute<Result<SupplierView, DomainError>>(async () => {
      if (!isSupplierId(command.payload.id)) {
        return Result.fail(new SupplierNotFoundError(command.payload.id));
      }

      const supplierId = supplierIdFrom(command.payload.id);
      const loaded = await this.repository.get(tenantId, supplierId);
      if (loaded === undefined) {
        return Result.fail(new SupplierNotFoundError(command.payload.id));
      }

      const expectedRevision = Revision.of(command.payload.expectedRevision);
      if (!loaded.revision.equals(expectedRevision)) {
        const conflict = toConflict(
          staleRevisionConflict('Supplier.activate', expectedRevision, loaded.revision),
        );
        return Result.fail(conflict!);
      }

      const supplier = loaded.aggregate;
      const transition = supplier.activate(DateTime.now());
      if (transition.isFail()) {
        return Result.fail(transition.errorOrThrow());
      }

      try {
        const receipt = await this.repository.update(supplier, expectedRevision);

        await this.audit.record({
          action: 'supplier.activate',
          outcome: 'success',
          actorUserId,
          target: { type: 'supplier', id: supplier.id.value },
          metadata: {
            code: supplier.code.value,
          },
        });

        return Result.ok(toSupplierView(supplier, receipt.revision.value));
      } catch (error) {
        const conflict = toConflict(error);
        if (conflict !== undefined) {
          return Result.fail(conflict);
        }
        throw error;
      }
    });
  }
}
