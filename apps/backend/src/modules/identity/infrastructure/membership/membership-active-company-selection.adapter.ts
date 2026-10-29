import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import type {
  ActiveCompanySelection,
  ActiveCompanySelectionPort,
} from '../../../tenant/public-api.js';
import { SelectActiveCompany } from '../../application/commands/select-active-company.command.js';
import type { SelectActiveCompanyUseCase } from '../../application/use-cases/select-active-company.use-case.js';

/**
 * Implements the tenant module's active-company contract with Identity's
 * existing selection use case (IAM-009).
 *
 * The adapter exists for the same reason the owner-enrollment one does: tenant
 * states *what* it needs, identity decides *how*. Reusing
 * `SelectActiveCompanyUseCase` means the HTTP route keeps the same membership
 * re-check, the same `TENANT_ACCESS_DENIED` answer for a non-member and the same
 * audited selection — there is no second, weaker write path.
 *
 * It translates the use case's own view into the tenant contract and nothing
 * else, so neither module's application types leak into the other.
 */
export class MembershipActiveCompanySelection implements ActiveCompanySelectionPort {
  public constructor(private readonly selectActiveCompany: SelectActiveCompanyUseCase) {}

  public async select(input: {
    readonly userId: string;
    readonly tenantId: string;
  }): Promise<Result<ActiveCompanySelection, DomainError>> {
    const outcome = await this.selectActiveCompany.execute(
      new SelectActiveCompany({ userId: input.userId, tenantId: input.tenantId }),
    );

    if (outcome.isFail()) {
      return Result.fail<DomainError>(outcome.errorOrThrow());
    }

    const selection = outcome.valueOrThrow();

    return Result.ok<ActiveCompanySelection>({
      tenantId: selection.tenantId,
      selectedAt: selection.selectedAt,
    });
  }
}
