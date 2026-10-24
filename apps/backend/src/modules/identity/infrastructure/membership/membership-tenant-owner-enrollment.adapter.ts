import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import type { TenantOwnerEnrollment } from '../../../tenant/public-api.js';
import { CreateMembership } from '../../application/commands/create-membership.command.js';
import type { CreateMembershipUseCase } from '../../application/use-cases/create-membership.use-case.js';

/**
 * Implements the tenant module's owner-enrollment contract with the Identity
 * module's existing membership use case (IAM-009; IAM-003).
 *
 * The adapter exists so neither module reaches into the other's internals:
 * tenant states *what* it needs, identity decides *how* a membership is made.
 * Reusing `CreateMembershipUseCase` means the owner's membership gets the same
 * validation, uniqueness rule, outbox event and audit record as every other
 * membership — there is no second, weaker path for company creation.
 *
 * Two details make the composition atomic:
 *
 * - It runs under the **new tenant's scope**, resolved from the tenant id the
 *   tenant module just generated. `CreateMembershipUseCase` reads the tenant
 *   from that ambient scope rather than trusting a payload field.
 * - It does not open a transaction of its own: membership creation joins the
 *   boundary the tenant use case already opened, so the tenant record and its
 *   owner's membership commit together.
 */
export class MembershipTenantOwnerEnrollment implements TenantOwnerEnrollment {
  public constructor(private readonly createMembership: CreateMembershipUseCase) {}

  public async enrollOwner(input: {
    readonly tenantId: string;
    readonly userId: string;
  }): Promise<Result<void, DomainError>> {
    return TenantScope.run(createTenantContext(input.tenantId), async () => {
      const outcome = await this.createMembership.execute(
        new CreateMembership({ userId: input.userId, tenantId: input.tenantId }),
      );

      return outcome.isOk() ? Result.ok(undefined) : Result.fail(outcome.errorOrThrow());
    });
  }
}
