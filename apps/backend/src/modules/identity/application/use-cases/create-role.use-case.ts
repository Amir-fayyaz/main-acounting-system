import { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { causedBy } from '../../../../shared/messaging/message.js';
import type { WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { tenantScopedMessageOptions } from '../../../../shared/tenant/tenant-message-options.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import type { TenantDirectory } from '../../../tenant/application/ports/tenant-directory.port.js';
import { Role } from '../../domain/aggregates/role.js';
import { RoleTenantNotFoundError } from '../../domain/errors/role.errors.js';
import { RoleCreated } from '../../domain/events/role.events.js';
import type { RoleRepository } from '../../domain/repositories/role.repository.js';
import type { CreateRole } from '../commands/create-role.command.js';
import type { RoleEventRecorder } from '../ports/role-event-recorder.port.js';
import { parseRoleName } from '../services/role-input.js';
import { resolveScopedTenant } from '../services/tenant-scope.js';
import { toRoleView } from '../views/role.mapper.js';
import type { RoleView } from '../views/role.view.js';

/**
 * Creates a Role within a Tenant (IAM-004).
 *
 * The use case is deliberately small and explicit:
 *
 * 1. validate the input in business terms (bad input is an expected failure,
 *    returned as a `Result`, not thrown);
 * 2. resolve the tenant boundary from the ambient tenant scope, so the write
 *    happens under the tenant it belongs to and a client-supplied tenant cannot
 *    point it elsewhere;
 * 3. inside **one** transaction boundary, confirm the tenant exists through the
 *    published `TenantDirectory` contract (never by reading tenant storage),
 *    insert the role and record `RoleCreated` in the outbox, so the fact commits
 *    with the state change or not at all (SHR-005, SHR-006);
 * 4. return the created role as a view, carrying the revision the next change
 *    must state.
 *
 * The role starts empty — creating it and granting it permissions are separate
 * decisions, so a role is never born with authority nobody asked for.
 *
 * Authorization is intentionally absent: this records a role, not whether a
 * caller may create one.
 */
export class CreateRoleUseCase {
  public constructor(
    private readonly roles: RoleRepository,
    private readonly tenants: TenantDirectory,
    private readonly events: RoleEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: CreateRole): Promise<Result<RoleView, DomainError>> {
    const name = parseRoleName(command.payload.name);
    if (name.isFail()) {
      return Result.fail(name.errorOrThrow());
    }

    const tenantId = resolveScopedTenant(command.payload.tenantId);
    if (tenantId.isFail()) {
      return Result.fail(tenantId.errorOrThrow());
    }

    const tenant = tenantId.valueOrThrow();

    return this.boundary.execute<Result<RoleView, DomainError>>(async () => {
      if (!(await this.tenants.exists(tenant.value))) {
        return Result.fail(new RoleTenantNotFoundError());
      }

      const role = Role.create({
        tenantId: tenant,
        name: name.valueOrThrow(),
        now: DateTime.now(),
      });

      const receipt: WriteReceipt = await this.roles.add(role);

      await this.events.record(
        new RoleCreated(
          {
            roleId: role.roleId(),
            tenantId: role.tenantIdValue(),
            name: role.name.value,
            permissions: role.permissions(),
          },
          tenantScopedMessageOptions(causedBy(command)),
        ),
      );

      return Result.ok(toRoleView({ aggregate: role, revision: receipt.revision }));
    });
  }
}
