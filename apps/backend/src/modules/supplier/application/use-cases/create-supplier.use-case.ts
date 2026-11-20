import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { ActorScope } from '../../../../shared/actor/actor-scope.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import type { AuditRecorder } from '../../../audit/application/ports/audit-recorder.port.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../../../shared/persistence/persistence-error.js';
import { Supplier } from '../../domain/aggregates/supplier.js';
import { SupplierCode } from '../../domain/value-objects/supplier-code.js';
import { SupplierName } from '../../domain/value-objects/supplier-name.js';
import { NormalizedSupplierName } from '../../domain/value-objects/normalized-supplier-name.js';
import { LegalIdentificationNumber } from '../../domain/value-objects/legal-identification-number.js';
import { SupplierContactInfo } from '../../domain/value-objects/supplier-contact-info.js';
import {
  SupplierCodeDuplicateError,
  SupplierIdentificationDuplicateError,
} from '../../domain/errors/supplier.errors.js';
import type { SupplierRepository } from '../../domain/repositories/supplier.repository.js';
import type { CreateSupplierCommand } from '../commands/supplier.commands.js';
import type { SupplierAuthorizationPort } from '../ports/supplier-authorization.port.js';
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
  ) {}

  public async execute(
    command: CreateSupplierCommand,
  ): Promise<Result<CreateSupplierResult, DomainError>> {
    const tenantId = TenantScope.requireTenantId();
    const actorUserId = ActorScope.current()?.userId ?? command.payload.principal?.userId;

    // Role check: writes without permission are refused and audited (B-03)
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
      const normalizedName = NormalizedSupplierName.fromSupplierName(name);
      const identificationNumber = command.payload.identificationNumber
        ? LegalIdentificationNumber.from(command.payload.identificationNumber)
        : undefined;
      const contactInfo = command.payload.contactInfo
        ? SupplierContactInfo.create(command.payload.contactInfo)
        : undefined;

      // Duplicate check 1: Code uniqueness per tenant
      const existingByCode = await this.repository.findByCode(tenantId, code);
      if (existingByCode !== undefined) {
        return Result.fail(new SupplierCodeDuplicateError(code.value));
      }

      // Duplicate check 2: Identification number uniqueness per tenant
      if (identificationNumber !== undefined) {
        const existingById = await this.repository.findByIdentification(
          tenantId,
          identificationNumber,
        );
        if (existingById !== undefined) {
          return Result.fail(new SupplierIdentificationDuplicateError(identificationNumber.value));
        }
      }

      // Duplicate check 3: Normalized name reporting & explicit confirmation requirement
      const matchingByName = await this.repository.findByNormalizedName(tenantId, normalizedName);
      if (matchingByName.length > 0 && command.payload.confirmDuplicate !== true) {
        return Result.ok({
          status: 'possible_duplicates',
          duplicates: matchingByName.map((entry) => toPossibleDuplicateView(entry.aggregate)),
        });
      }

      const now = DateTime.now();
      const supplier = Supplier.create({
        tenantId,
        code,
        name,
        identificationNumber,
        contactInfo,
        now,
      });

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
          const message = error.message.toLowerCase();
          if (message.includes('code') || message.includes('supplier_code')) {
            return Result.fail(new SupplierCodeDuplicateError(code.value));
          }
          if (
            identificationNumber &&
            (message.includes('identification') || message.includes('id_number'))
          ) {
            return Result.fail(
              new SupplierIdentificationDuplicateError(identificationNumber.value),
            );
          }
        }
        throw error;
      }
    });
  }
}
