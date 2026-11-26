import { ActorScope } from '../../../../shared/actor/actor-scope.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../../../shared/persistence/persistence-error.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { normalizePersianSearch } from '../../../../shared/text/persian-search.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import type { AuditRecorder } from '../../../audit/application/ports/audit-recorder.port.js';
import { Supplier } from '../../domain/aggregates/supplier.js';
import {
  SupplierCodeDuplicateError,
  SupplierIdentificationDuplicateError,
} from '../../domain/errors/supplier.errors.js';
import { SupplierDuplicatePolicy } from '../../domain/policies/supplier-duplicate.policy.js';
import { SupplierCode } from '../../domain/value-objects/supplier-code.js';
import { SupplierContactInfo } from '../../domain/value-objects/supplier-contact-info.js';
import { SupplierIdentificationNumber } from '../../domain/value-objects/supplier-identification-number.js';
import { SupplierName } from '../../domain/value-objects/supplier-name.js';
import type { CreateSupplierCommand } from '../commands/supplier.commands.js';
import type { SupplierAuthorizationPort } from '../ports/supplier-authorization.port.js';
import type { SupplierRepository } from '../ports/supplier-repository.port.js';
import {
  toPossibleDuplicateView,
  toSupplierView,
  type CreateSupplierResult,
} from '../views/supplier.view.js';

export class CreateSupplierUseCase {
  public constructor(
    private readonly repository: SupplierRepository,
    private readonly authorization: SupplierAuthorizationPort,
    private readonly audit: AuditRecorder,
    private readonly boundary: TransactionBoundary,
    private readonly duplicatePolicy: SupplierDuplicatePolicy = new SupplierDuplicatePolicy(
      normalizePersianSearch,
    ),
  ) {}

  public async execute(
    command: CreateSupplierCommand,
  ): Promise<Result<CreateSupplierResult, DomainError>> {
    const tenantId = TenantScope.requireTenantId();
    const actorUserId = ActorScope.current()?.userId ?? command.payload.principal?.userId;

    const authOutcome = await this.authorization.authorizeWrite(
      tenantId,
      command.payload.principal,
    );
    if (authOutcome.isFail()) {
      await this.audit.record({
        action: 'supplier.create',
        outcome: 'denied',
        actorUserId,
        target: { type: 'supplier', id: 'new' },
      });
      return Result.fail(authOutcome.errorOrThrow());
    }

    return this.boundary.execute<Result<CreateSupplierResult, DomainError>>(async () => {
      const code = SupplierCode.from(command.payload.code);
      const name = SupplierName.from(command.payload.name);
      const identificationNumber =
        command.payload.identificationNumber !== undefined
          ? SupplierIdentificationNumber.from(command.payload.identificationNumber)
          : undefined;
      const contactInfo =
        command.payload.contactInfo !== undefined
          ? SupplierContactInfo.create(command.payload.contactInfo)
          : undefined;

      const existing = await this.repository.findByTenant(tenantId);
      const existingSuppliers = existing.map((loaded) => ({
        id: loaded.aggregate.id,
        tenantId: loaded.aggregate.tenantId,
        code: loaded.aggregate.code,
        name: loaded.aggregate.name,
        normalizedName: loaded.aggregate.normalizedName,
        identificationNumber: loaded.aggregate.identificationNumber,
      }));

      const now = DateTime.now();
      const creationResult = Supplier.create({
        tenantId,
        code,
        name,
        identificationNumber,
        contactInfo,
        now,
        existingSuppliers,
        duplicatePolicy: this.duplicatePolicy,
        confirmPossibleDuplicate: command.payload.confirmDuplicate,
      });

      if (creationResult.isFail()) {
        return Result.fail(creationResult.errorOrThrow());
      }

      const outcome = creationResult.valueOrThrow();
      if (outcome.kind === 'possibleDuplicate') {
        return Result.ok({
          status: 'possible_duplicates',
          duplicates: outcome.matches.map(toPossibleDuplicateView),
        });
      }

      const supplier = outcome.supplier;

      try {
        const receipt = await this.repository.add(supplier);

        await this.audit.record({
          action: 'supplier.create',
          outcome: 'success',
          actorUserId,
          target: { type: 'supplier', id: supplier.id.value },
          metadata: {
            code: supplier.code.value,
            name: supplier.name.value,
          },
        });

        return Result.ok({
          status: 'created',
          supplier: toSupplierView(supplier, receipt.revision.value),
        });
      } catch (error) {
        if (error instanceof PersistenceError && error.kind === PersistenceFailureKind.CONFLICT) {
          const mapped = mapPersistenceConflict(error, code.value, identificationNumber?.value);
          if (mapped !== undefined) {
            return Result.fail(mapped);
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
