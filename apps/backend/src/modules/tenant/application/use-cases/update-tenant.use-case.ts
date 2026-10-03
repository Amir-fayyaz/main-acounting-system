import { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { toConflict } from '../../../../shared/persistence/optimistic-concurrency.js';
import type { WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { tenantScopedMessageOptions } from '../../../../shared/tenant/tenant-message-options.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { TenantProfileUpdated } from '../../domain/events/tenant.events.js';
import type { TenantRepository } from '../../domain/repositories/tenant.repository.js';
import type { UpdateTenant } from '../commands/update-tenant.command.js';
import { parseTenantName } from '../services/tenant-input.js';
import { tenantNotFound, resolveScopedTenantId } from '../services/tenant-scope.js';
import { toTenantView } from '../views/tenant.mapper.js';
import type { TenantEventRecorder } from '../ports/tenant-event-recorder.port.js';
import type { TenantView } from '../views/tenant.view.js';

/**
 * Changes a tenant's mutable profile attribute (IAM-001).
 *
 * The write is protected end to end by the shared optimistic-concurrency
 * mechanism:
 *
 * - the command carries the revision the caller read;
 * - the repository refuses the write if the record moved, and the adapter
 *   reports that as a `staleRevisionConflict` (SHR-008);
 * - the use case translates it with `toConflict` into the shared
 *   `ConflictError`, so the client is told to reload instead of a silent
 *   overwrite happening.
 *
 * Before mutating, the use case validates the *current tenant state*: an
 * inactive tenant refuses the change (`InactiveTenantError`), which the use
 * case turns into a `Result` rather than letting a domain exception escape a
 * normal business outcome. Either way the boundary is marked failed and rolls
 * back — including the outbox event, which is only recorded after a successful
 * write.
 */
export class UpdateTenantUseCase {
  public constructor(
    private readonly repository: TenantRepository,
    private readonly events: TenantEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: UpdateTenant): Promise<Result<TenantView, DomainError>> {
    const { tenantId: rawId, name: rawName, expectedRevision } = command.payload;

    const tenantId = resolveScopedTenantId(rawId);
    if (tenantId.isFail()) {
      return Result.fail(tenantId.errorOrThrow());
    }

    const name = parseTenantName(rawName);
    if (name.isFail()) {
      return Result.fail(name.errorOrThrow());
    }

    const id = tenantId.valueOrThrow();

    return this.boundary.execute<Result<TenantView, DomainError>>(async () => {
      const loaded = await this.repository.get(id);
      if (loaded === undefined) {
        return Result.fail(tenantNotFound());
      }

      const tenant = loaded.aggregate;

      try {
        tenant.rename(name.valueOrThrow(), DateTime.now());
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
        new TenantProfileUpdated(
          { tenantId: tenant.tenantId(), name: tenant.name.value },
          tenantScopedMessageOptions(),
        ),
      );

      return Result.ok(toTenantView({ aggregate: tenant, revision: receipt.revision }));
    });
  }
}
