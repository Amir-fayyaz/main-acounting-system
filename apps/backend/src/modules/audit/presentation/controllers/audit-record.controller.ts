import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Authorize } from '../../../../infrastructure/api/authorization/authorization-policy.js';
import { API_ERROR_CODES } from '../../../../infrastructure/api/errors/api-error.registry.js';
import { ApiErrorResponseDto } from '../../../../infrastructure/api/errors/api-error.dto.js';
import { ApiErrorException } from '../../../../infrastructure/api/errors/api-error.exception.js';
import type { ApiErrorDetail } from '../../../../infrastructure/api/errors/api-error.types.js';
import type { Paginated } from '../../../../infrastructure/api/pagination/pagination.js';
import { paginationMeta } from '../../../../infrastructure/api/pagination/pagination.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import type { ErrorDetail } from '../../../../shared/errors/error-detail.js';
import { isOpaqueIdentifier } from '../../domain/audit-identifiers.js';
import { ListTenantAuditRecords } from '../../application/queries/list-tenant-audit-records.query.js';
import { ListTenantAuditRecordsUseCase } from '../../application/use-cases/list-tenant-audit-records.use-case.js';
import type { AuditRecordView } from '../../application/views/audit-record.view.js';
import { AuditRecordResponseDto } from '../dto/audit-record-response.dto.js';
import { ListAuditRecordsQueryDto } from '../dto/list-audit-records-query.dto.js';
import { PaginatedAuditRecordsDto } from '../dto/paginated-audit-records.dto.js';

/**
 * The audit trail REST resource (AUD-001; FND-006; ADR-013).
 *
 * One operation, and it is a *read*: the trail is written by the modules that
 * perform the operations, through the published audit contract — there is no
 * endpoint that creates, edits or deletes an audit record, because an audit
 * trail that a client could write to would be evidence a client invented, and
 * one it could delete would be no evidence at all.
 *
 * **The read is tenant-scoped and nested under the tenant**
 * (`/tenants/:tenantId/audit-records`), exactly like the role and membership
 * resources: the target tenant is the boundary of the operation, and the
 * controller establishes it in the shared tenant scope before the use case runs.
 * The use case then re-checks the requested tenant against that scope, so the
 * read cannot leave the caller's company even if the path were crafted by hand.
 *
 * **Authorization is declared here and decided elsewhere** (IAM-006). The
 * operation requires the `audit.read` capability *in that tenant*: the
 * authorization boundary verifies the caller's active membership there before
 * this handler runs, so an ordinary tenant user holding no audit capability is
 * refused (403) — and the refusal is itself a security event the authorization
 * decision records.
 *
 * No request header, body or query field is ever read as tenant identity. The
 * route parameter is the *claim* the boundary verified; the scope is what the
 * read actually runs under.
 */
@ApiBearerAuth()
@ApiTags('audit')
@Controller()
export class AuditRecordsController {
  public constructor(private readonly listAuditRecords: ListTenantAuditRecordsUseCase) {}

  @Get('tenants/:tenantId/audit-records')
  @Authorize({ permission: 'audit.read', tenantParam: 'tenantId' })
  @ApiOperation({
    summary: "List a tenant's audit trail using the standard pagination envelope",
    description:
      'Returns audit records of the tenant, newest first. Requires an active membership in the tenant with "audit.read". Records of other tenants are never returned: the trail is read under the tenant scope the boundary verified, not under any value supplied in the request.',
  })
  @ApiOkResponse({ type: PaginatedAuditRecordsDto, description: 'One page of the audit trail.' })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'A filter or pagination parameter is invalid.',
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'The caller does not hold "audit.read" in this tenant.',
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'The requested tenant is not the tenant the caller may read.',
  })
  async list(
    @Param('tenantId') tenantId: string,
    @Query() query: ListAuditRecordsQueryDto,
  ): Promise<Paginated<AuditRecordResponseDto>> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.listAuditRecords.execute(
        new ListTenantAuditRecords({
          tenantId,
          ...(query.actorUserId === undefined ? {} : { actorUserId: query.actorUserId }),
          ...(query.action === undefined ? {} : { action: query.action }),
          ...(query.targetType === undefined ? {} : { targetType: query.targetType }),
          ...(query.targetId === undefined ? {} : { targetId: query.targetId }),
          ...(query.outcome === undefined ? {} : { outcome: query.outcome }),
          ...(query.from === undefined ? {} : { from: query.from }),
          ...(query.to === undefined ? {} : { to: query.to }),
          page: query.page,
          limit: query.limit,
        }),
      ),
    );

    return outcome.match<Paginated<AuditRecordResponseDto>>({
      // The page came from the store already limited, and the total is the
      // filtered count: the envelope is the established one, built from real
      // numbers rather than from a slice of a loaded collection.
      ok: (page) => ({
        data: page.records.map(toAuditRecordResponse),
        meta: paginationMeta(page.total, query),
      }),
      fail: (error) => this.raise(error),
    });
  }

  /**
   * Runs `work` under the tenant scope the trusted boundary published.
   *
   * The scope is established once, by the global tenant-scope interceptor, from
   * the tenant the authorization boundary *verified* — it ran before this
   * handler, and a request whose claim was not backed by a membership never
   * reaches here. This helper therefore does not *establish* anything: it only
   * checks that the route carries a well-formed tenant identifier and lets the
   * established scope stand. The use case re-checks the path against it, so a
   * request for another company's trail is refused before anything is read.
   */
  private async inTenantScope<T>(rawId: string, work: () => Promise<T>): Promise<T> {
    if (!isOpaqueIdentifier(rawId)) {
      throw ApiErrorException.notFound();
    }

    return work();
  }

  /**
   * Turns a domain failure into the transport failure FND-006 defines for its
   * category: 404 for a read outside the caller's scope, 400 for rejected
   * filters. Every other category is rethrown as the `DomainError` it is and
   * mapped by the shared exception filter.
   */
  private raise(error: DomainError): never {
    switch (error.category) {
      case ErrorCategory.NOT_FOUND:
        throw ApiErrorException.notFound();
      case ErrorCategory.VALIDATION:
        throw ApiErrorException.validation(toApiDetails(error.details), error.message);
      case ErrorCategory.CONFLICT:
        throw ApiErrorException.of(API_ERROR_CODES.CONFLICT, {
          message: error.message,
          details: toApiDetails(error.details),
        });
      default:
        throw error;
    }
  }
}

/** Maps the application view to the response DTO, with `null` for absent values. */
function toAuditRecordResponse(view: AuditRecordView): AuditRecordResponseDto {
  return {
    id: view.id,
    tenantId: view.tenantId ?? null,
    actorType: view.actorType,
    actorUserId: view.actorUserId ?? null,
    action: view.action,
    targetType: view.targetType ?? null,
    targetId: view.targetId ?? null,
    outcome: view.outcome,
    occurredAt: view.occurredAt,
    correlationId: view.correlationId ?? null,
    causationId: view.causationId ?? null,
    metadata: view.metadata,
  };
}

/** Narrows kernel error details to the API error-detail shape. */
function toApiDetails(details: readonly ErrorDetail[]): readonly ApiErrorDetail[] {
  return details.map((detail) => ({
    field: detail.field ?? '',
    code: detail.code,
    message: detail.message,
  }));
}
