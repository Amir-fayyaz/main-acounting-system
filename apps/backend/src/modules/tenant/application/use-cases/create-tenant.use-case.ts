import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import type { WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { tenantScopedMessageOptions } from '../../../../shared/tenant/tenant-message-options.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { Tenant } from '../../domain/aggregates/tenant.js';
import { TenantCreated } from '../../domain/events/tenant.events.js';
import type { TenantRepository } from '../../domain/repositories/tenant.repository.js';
import type { CreateTenant } from '../commands/create-tenant.command.js';
import { parseTenantName } from '../services/tenant-input.js';
import { toTenantView } from '../views/tenant.mapper.js';
import type { TenantEventRecorder } from '../ports/tenant-event-recorder.port.js';
import type { TenantOwnerEnrollment } from '../ports/tenant-owner-enrollment.port.js';
import type { TenantView } from '../views/tenant.view.js';

/**
 * Creates a tenant — the root of a new tenant boundary — and enrolls its
 * creator as the first member (IAM-001; IAM-009).
 *
 * The use case is deliberately small and explicit:
 *
 * 1. validate the input in business terms (bad input is an expected failure,
 *    returned as a `Result`, not thrown);
 * 2. create the aggregate, which assigns the stable identity and starts it in
 *    the `Active` state;
 * 3. inside **one** transaction boundary, insert the record, record
 *    `TenantCreated` in the outbox, and provision the creator's membership —
 *    so a company and the person who can enter it commit together or not at
 *    all (SHR-005, SHR-006);
 * 4. return the created tenant as a view, carrying the revision the next
 *    update must state.
 *
 * Creation is a system-level operation: there is no tenant scope yet, so no
 * tenant is read from anywhere. The event is stamped with the *new* tenant id,
 * which is exactly the boundary it establishes — never a client-supplied
 * tenant.
 *
 * The event and the membership are recorded under the **new tenant's** scope.
 * That is the one legitimate moment to enter it: the company now exists, and
 * its owner membership and audit record belong to it. When the scope closes,
 * the caller's system scope is restored untouched.
 *
 * A failed enrollment fails the whole creation: the boundary rolls back the
 * tenant row, so no half-created company is left behind.
 */
export class CreateTenantUseCase {
  public constructor(
    private readonly repository: TenantRepository,
    private readonly owners: TenantOwnerEnrollment,
    private readonly events: TenantEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: CreateTenant): Promise<Result<TenantView, DomainError>> {
    const name = parseTenantName(command.payload.name);
    if (name.isFail()) {
      return Result.fail(name.errorOrThrow());
    }

    const tenant = Tenant.create({ name: name.valueOrThrow(), now: DateTime.now() });
    const tenantId = tenant.tenantId();
    let receipt!: WriteReceipt;

    const provisioned = await this.boundary.execute<Result<void, DomainError>>(async () => {
      receipt = await this.repository.add(tenant);

      return TenantScope.run(createTenantContext(tenantId), async () => {
        await this.events.record(
          new TenantCreated(
            {
              tenantId,
              name: tenant.name.value,
              status: tenant.status.value,
            },
            tenantScopedMessageOptions({ tenantId }),
          ),
        );

        const enrolled = await this.owners.enrollOwner({
          tenantId,
          userId: command.payload.ownerUserId,
        });

        return enrolled.isOk() ? Result.ok(undefined) : Result.fail(enrolled.errorOrThrow());
      });
    });

    if (provisioned.isFail()) {
      return Result.fail(provisioned.errorOrThrow());
    }

    return Result.ok(toTenantView({ aggregate: tenant, revision: receipt.revision }));
  }
}
