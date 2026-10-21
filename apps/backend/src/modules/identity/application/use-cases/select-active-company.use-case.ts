import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import type { AuditRecorder } from '../../../audit/application/ports/audit-recorder.port.js';
import { TenantAccessDeniedError } from '../../domain/errors/tenant-access.errors.js';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';
import { isUserId, userIdFrom } from '../../domain/value-objects/user-id.js';
import {
  isTenantReference,
  tenantReferenceFrom,
} from '../../domain/value-objects/tenant-reference.js';
import type { ActiveTenantPreference } from '../ports/active-tenant-preference.port.js';
import type { SelectActiveCompany } from '../commands/select-active-company.command.js';
import type { ActiveCompanyView } from '../views/active-company.view.js';

/**
 * Selects the active company for the authenticated user.
 *
 * - Tenant id from the trusted path claim only.
 * - Requires an **active** membership; otherwise `TENANT_ACCESS_DENIED`.
 * - Writes the preference and an audit fact on success or denial.
 */
export class SelectActiveCompanyUseCase {
  public constructor(
    private readonly memberships: MembershipRepository,
    private readonly preferences: ActiveTenantPreference,
    private readonly audit: AuditRecorder,
  ) {}

  public async execute(
    command: SelectActiveCompany,
  ): Promise<Result<ActiveCompanyView, DomainError>> {
    const { userId: rawUserId, tenantId: rawTenantId } = command.payload;

    if (!isUserId(rawUserId) || !isTenantReference(rawTenantId)) {
      return Result.fail(new TenantAccessDeniedError());
    }

    const userId = userIdFrom(rawUserId);
    const tenantId = tenantReferenceFrom(rawTenantId);

    const loaded = await this.memberships.findByUserId(userId);
    const membership = loaded.find(
      (row) => row.aggregate.tenantIdValue() === tenantId.value && row.aggregate.isActive(),
    );

    if (membership === undefined) {
      await this.audit.record({
        action: 'company.select_active',
        outcome: 'denied',
        actorUserId: rawUserId,
        target: { type: 'tenant', id: rawTenantId },
      });
      return Result.fail(new TenantAccessDeniedError());
    }

    await this.preferences.set(rawUserId, rawTenantId);

    await this.audit.record({
      action: 'company.select_active',
      outcome: 'success',
      actorUserId: rawUserId,
      target: { type: 'tenant', id: rawTenantId },
    });

    return Result.ok({ tenantId: rawTenantId, userId: rawUserId });
  }
}
