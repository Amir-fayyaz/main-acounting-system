import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import type { ListTenantAuditRecords } from '../queries/list-tenant-audit-records.query.js';
import type { AuditRecordPage, AuditRecordQuery } from '../ports/audit-record-query.port.js';
import { parseAuditRecordFilters } from '../services/audit-filters.js';
import { resolveAuditTenant } from '../services/audit-scope.js';

/**
 * Reads one tenant's audit trail, within the caller's scope (AUD-001;
 * SHR-007; ADR-003 section 24).
 *
 * Three things happen, in this order, and the order is the point:
 *
 * 1. the tenant is resolved from the ambient tenant scope and the requested one
 *    is checked against it — so the read can never leave the caller's company,
 *    and a mismatching claim is answered as not-found without revealing whether
 *    the other tenant's records exist;
 * 2. the filters are validated as business input (a malformed filter is a
 *    `ValidationError`, not a silently dropped one);
 * 3. the store answers one page plus the total, so the standard pagination
 *    envelope is built from real counts instead of a loaded collection.
 *
 * Authorization is deliberately *not* decided here: whether the caller may read
 * the trail at all is the `audit.read` capability check the HTTP boundary (or
 * any other caller of the authorization contract) performs before this use case
 * runs. This use case answers only "what is in the tenant's trail, filtered like
 * this" — and it answers with records that are already tenant-scoped, so a
 * consumer cannot widen the question by construction.
 */
export class ListTenantAuditRecordsUseCase {
  public constructor(private readonly records: AuditRecordQuery) {}

  public async execute(
    query: ListTenantAuditRecords,
  ): Promise<Result<AuditRecordPage, DomainError>> {
    const tenantId = resolveAuditTenant(query.params.tenantId);
    if (tenantId.isFail()) {
      return Result.fail(tenantId.errorOrThrow());
    }

    const filters = parseAuditRecordFilters(query.params);
    if (filters.isFail()) {
      return Result.fail(filters.errorOrThrow());
    }

    const page = await this.records.read({
      tenantId: tenantId.valueOrThrow(),
      ...filters.valueOrThrow(),
    });

    return Result.ok(page);
  }
}
