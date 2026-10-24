import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import type { AuditRecorder } from '../../../audit/application/ports/audit-recorder.port.js';
import {
  AuthorizationContextInvalidError,
  TenantAccessDeniedError,
} from '../../domain/errors/authorization.errors.js';
import {
  isTenantReference,
  tenantReferenceFrom,
} from '../../domain/value-objects/tenant-reference.js';
import { isUserId, userIdFrom } from '../../domain/value-objects/user-id.js';
import type { SelectActiveCompany } from '../commands/select-active-company.command.js';
import type { ActiveCompanyPreference } from '../ports/active-company-preference.port.js';
import type { TenantMembership } from '../ports/tenant-membership.port.js';
import type { ActiveCompanyView } from '../views/active-company.view.js';

/**
 * Makes one company the caller's active company (IAM-009).
 *
 * The logic is deliberately tiny, and each step earns its place:
 *
 * 1. **Resolve the two identities.** The user comes from the authenticated
 *    principal; the company is the route identifier the authorization boundary
 *    verified. Both are re-validated here so the use case is safe to call from
 *    a job or another module, not only through HTTP.
 * 2. **Re-check active membership.** The boundary already denied a non-member,
 *    but a membership can be deactivated between that decision and this write.
 *    The use case therefore proves the relationship again and answers a
 *    non-member with `TENANT_ACCESS_DENIED` — the same answer, and the same
 *    non-disclosure, as the boundary.
 * 3. **Store the preference and audit it together.** The durable selection and
 *    the audit record share one transaction: if either fails, neither lands.
 *
 * Selecting a company grants nothing. It only records where the user wants to
 * work; every subsequent operation is still authorized against that company's
 * membership and the caller's permissions.
 */
export class SelectActiveCompanyUseCase {
  public constructor(
    private readonly memberships: TenantMembership,
    private readonly preferences: ActiveCompanyPreference,
    private readonly audit: AuditRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(
    command: SelectActiveCompany,
  ): Promise<Result<ActiveCompanyView, DomainError>> {
    if (!isUserId(command.payload.userId)) {
      return Result.fail(new AuthorizationContextInvalidError());
    }

    if (!isTenantReference(command.payload.tenantId)) {
      return Result.fail(new TenantAccessDeniedError());
    }

    const userId = userIdFrom(command.payload.userId);
    const tenantId = tenantReferenceFrom(command.payload.tenantId);

    const membership = await this.memberships.findActiveForUserAndTenant(userId, tenantId);

    if (membership === undefined) {
      // A refusal is itself a security fact: record it before answering, so a
      // denied selection leaves durable evidence even though it wrote nothing.
      await this.audit.record({
        action: 'company.selection_denied',
        outcome: 'denied',
        actorUserId: userId.value,
        target: { type: 'tenant', id: tenantId.value },
        metadata: { reason: 'TENANT_ACCESS_DENIED' },
      });

      return Result.fail(new TenantAccessDeniedError());
    }

    const selectedAt = DateTime.now();

    await this.boundary.execute(async () => {
      await this.preferences.setActiveTenant(userId, tenantId, selectedAt);

      await this.audit.record({
        action: 'company.selected',
        outcome: 'success',
        actorUserId: userId.value,
        target: { type: 'tenant', id: tenantId.value },
        metadata: { activeTenantId: tenantId.value },
      });
    });

    return Result.ok({ tenantId: tenantId.value, selectedAt: selectedAt.toIsoString() });
  }
}
