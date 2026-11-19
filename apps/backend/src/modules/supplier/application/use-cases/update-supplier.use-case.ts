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
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../../../shared/persistence/persistence-error.js';
import { isSupplierId, supplierIdFrom } from '../../domain/value-objects/supplier-id.js';
import { SupplierCode } from '../../domain/value-objects/supplier-code.js';
import { SupplierName } from '../../domain/value-objects/supplier-name.js';
import { LegalIdentificationNumber } from '../../domain/value-objects/legal-identification-number.js';
import { SupplierContactInfo } from '../../domain/value-objects/supplier-contact-info.js';
import {
  SupplierCodeDuplicateError,
  SupplierIdentificationDuplicateError,
  SupplierNotFoundError,
} from '../../domain/errors/supplier.errors.js';
import type { SupplierRepository } from '../../domain/repositories/supplier.repository.js';
import type { UpdateSupplierCommand } from '../commands/supplier.commands.js';
import type { SupplierAuthorizationPort } from '../ports/supplier-authorization.port.js';
import { toSupplierView, type SupplierView } from '../views/supplier.view.js';

export class UpdateSupplierUseCase {
  public constructor(
    private readonly repository: SupplierRepository,
    private readonly authorization: SupplierAuthorizationPort,
    private readonly audit: AuditRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: UpdateSupplierCommand): Promise<Result<SupplierView, DomainError>> {
    const tenantId = TenantScope.requireTenantId();
    const actorUserId = ActorScope.current()?.userId ?? command.payload.principal?.userId;

    // Role check: writes without permission are refused and audited (B-03)
    const authOutcome = await this.authorization.authorizeWrite(
      tenantId,
      command.payload.principal,
    );
    if (authOutcome.isFail()) {
      await this.audit.record({
        action: 'supplier.update',
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

      // Optimistic concurrency check
      if (!loaded.revision.equals(expectedRevision)) {
        const conflict = staleRevisionConflict(
          'Supplier.update',
          expectedRevision,
          loaded.revision,
        );
        return Result.fail(conflict.toDomainError() ?? new ConflictError('Stale revision.'));
      }

      let newCode: SupplierCode | undefined;
      if (command.payload.code !== undefined) {
        newCode = SupplierCode.from(command.payload.code);
        if (!newCode.equals(supplier.code)) {
          const existing = await this.repository.findByCode(tenantId, newCode);
          if (existing !== undefined && existing.aggregate.id.value !== supplier.id.value) {
            return Result.fail(new SupplierCodeDuplicateError(newCode.value));
          }
        }
      }

      let newIdNum: LegalIdentificationNumber | null | undefined;
      if (command.payload.identificationNumber !== undefined) {
        if (command.payload.identificationNumber === null) {
          newIdNum = null;
        } else {
          newIdNum = LegalIdentificationNumber.from(command.payload.identificationNumber);
          if (
            supplier.identificationNumber === undefined ||
            !newIdNum.equals(supplier.identificationNumber)
          ) {
            const existing = await this.repository.findByIdentification(tenantId, newIdNum);
            if (existing !== undefined && existing.aggregate.id.value !== supplier.id.value) {
              return Result.fail(new SupplierIdentificationDuplicateError(newIdNum.value));
            }
          }
        }
      }

      const newName =
        command.payload.name !== undefined ? SupplierName.from(command.payload.name) : undefined;
      const newContact =
        command.payload.contactInfo !== undefined
          ? command.payload.contactInfo === null
            ? null
            : SupplierContactInfo.create(command.payload.contactInfo)
          : undefined;

      const now = DateTime.now();
      supplier.update({
        code: newCode,
        name: newName,
        identificationNumber: newIdNum,
        contactInfo: newContact,
        now,
      });

      try {
        const receipt = await this.repository.update(supplier, expectedRevision);

        await this.audit.record({
          action: 'supplier.update',
          outcome: 'success',
          actorUserId,
          target: { type: 'supplier', id: supplier.id.value },
          metadata: {
            code: supplier.code.value,
            name: supplier.name.value,
          },
        });

        return Result.ok(toSupplierView(supplier, receipt.revision.value));
      } catch (error) {
        if (isConcurrencyConflict(error)) {
          const conflict = toConflict(error);
          if (conflict) {
            return Result.fail(conflict);
          }
        }
        if (error instanceof PersistenceError && error.kind === PersistenceFailureKind.CONFLICT) {
          const message = error.message.toLowerCase();
          if (newCode && (message.includes('code') || message.includes('supplier_code'))) {
            return Result.fail(new SupplierCodeDuplicateError(newCode.value));
          }
          if (newIdNum && (message.includes('identification') || message.includes('id_number'))) {
            return Result.fail(new SupplierIdentificationDuplicateError(newIdNum.value));
          }
        }
        throw error;
      }
    });
  }
}
