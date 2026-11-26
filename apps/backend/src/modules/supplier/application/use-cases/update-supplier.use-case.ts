import { ActorScope } from '../../../../shared/actor/actor-scope.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import {
  staleRevisionConflict,
  toConflict,
} from '../../../../shared/persistence/optimistic-concurrency.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../../../shared/persistence/persistence-error.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { normalizePersianSearch } from '../../../../shared/text/persian-search.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import type { AuditRecorder } from '../../../audit/application/ports/audit-recorder.port.js';
import { Supplier } from '../../domain/aggregates/supplier.js';
import {
  SupplierCodeDuplicateError,
  SupplierIdentificationDuplicateError,
  SupplierNotFoundError,
} from '../../domain/errors/supplier.errors.js';
import { SupplierDuplicatePolicy } from '../../domain/policies/supplier-duplicate.policy.js';
import { SupplierCode } from '../../domain/value-objects/supplier-code.js';
import { SupplierContactInfo } from '../../domain/value-objects/supplier-contact-info.js';
import { isSupplierId, supplierIdFrom } from '../../domain/value-objects/supplier-id.js';
import { SupplierIdentificationNumber } from '../../domain/value-objects/supplier-identification-number.js';
import { SupplierName } from '../../domain/value-objects/supplier-name.js';
import type { UpdateSupplierCommand } from '../commands/supplier.commands.js';
import type { SupplierAuthorizationPort } from '../ports/supplier-authorization.port.js';
import type { SupplierRepository } from '../ports/supplier-repository.port.js';
import { toSupplierView, type SupplierView } from '../views/supplier.view.js';

export class UpdateSupplierUseCase {
  public constructor(
    private readonly repository: SupplierRepository,
    private readonly authorization: SupplierAuthorizationPort,
    private readonly audit: AuditRecorder,
    private readonly boundary: TransactionBoundary,
    private readonly duplicatePolicy: SupplierDuplicatePolicy = new SupplierDuplicatePolicy(
      normalizePersianSearch,
    ),
  ) {}

  public async execute(command: UpdateSupplierCommand): Promise<Result<SupplierView, DomainError>> {
    const tenantId = TenantScope.requireTenantId();
    const actorUserId = ActorScope.current()?.userId ?? command.payload.principal?.userId;

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
          staleRevisionConflict('Supplier.update', expectedRevision, loaded.revision),
        );
        return Result.fail(conflict!);
      }

      const current = loaded.aggregate;

      const code =
        command.payload.code !== undefined ? SupplierCode.from(command.payload.code) : current.code;

      const name =
        command.payload.name !== undefined ? SupplierName.from(command.payload.name) : current.name;

      const identificationNumber =
        command.payload.identificationNumber === null
          ? undefined
          : command.payload.identificationNumber !== undefined
            ? SupplierIdentificationNumber.from(command.payload.identificationNumber)
            : current.identificationNumber;

      const contactInfo =
        command.payload.contactInfo === null
          ? undefined
          : command.payload.contactInfo !== undefined
            ? SupplierContactInfo.create(command.payload.contactInfo)
            : current.contactInfo;

      const existing = await this.repository.findByTenant(tenantId);
      const otherSuppliers = existing
        .filter((entry) => !entry.aggregate.id.equals(supplierId))
        .map((entry) => ({
          id: entry.aggregate.id,
          tenantId: entry.aggregate.tenantId,
          code: entry.aggregate.code,
          name: entry.aggregate.name,
          normalizedName: entry.aggregate.normalizedName,
          identificationNumber: entry.aggregate.identificationNumber,
        }));

      const assessment = this.duplicatePolicy.evaluate(
        {
          tenantId,
          code,
          name,
          identificationNumber,
        },
        otherSuppliers,
      );

      if (assessment.decision.kind === 'conflict') {
        return Result.fail(assessment.decision.error);
      }

      const snapshot = current.snapshot();
      const updated = Supplier.rehydrate({
        ...snapshot,
        code: code.value,
        name: name.value,
        normalizedName: assessment.normalizedName,
        identificationNumber: identificationNumber?.value,
        contactInfo: contactInfo?.toJSON(),
        updatedAt: DateTime.now(),
      });

      try {
        const receipt = await this.repository.update(updated, expectedRevision);

        await this.audit.record({
          action: 'supplier.update',
          outcome: 'success',
          actorUserId,
          target: { type: 'supplier', id: updated.id.value },
          metadata: {
            code: updated.code.value,
            name: updated.name.value,
          },
        });

        return Result.ok(toSupplierView(updated, receipt.revision.value));
      } catch (error) {
        if (error instanceof PersistenceError && error.kind === PersistenceFailureKind.CONFLICT) {
          const mapped = mapPersistenceConflict(error, code.value, identificationNumber?.value);
          if (mapped !== undefined) {
            return Result.fail(mapped);
          }
          const conflict = toConflict(error);
          if (conflict !== undefined) {
            return Result.fail(conflict);
          }
        }
        throw error;
      }
    });
  }
}

function mapPersistenceConflict(
  error: PersistenceError,
  code: string,
  identificationNumber?: string,
): DomainError | undefined {
  const details = `${error.message} ${error.operation}`.toLowerCase();
  if (details.includes('code') || details.includes('supplier_code')) {
    return new SupplierCodeDuplicateError(code);
  }
  if (
    identificationNumber !== undefined &&
    (details.includes('identification') || details.includes('id_number'))
  ) {
    return new SupplierIdentificationDuplicateError(identificationNumber);
  }
  return undefined;
}
