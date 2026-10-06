import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_ERROR_CODES } from '../../../../infrastructure/api/errors/api-error.registry.js';
import { ApiErrorResponseDto } from '../../../../infrastructure/api/errors/api-error.dto.js';
import { ApiErrorException } from '../../../../infrastructure/api/errors/api-error.exception.js';
import type { ApiErrorDetail } from '../../../../infrastructure/api/errors/api-error.types.js';
import type { Paginated } from '../../../../infrastructure/api/pagination/pagination.js';
import { paginate } from '../../../../infrastructure/api/pagination/pagination.js';
import { PaginationQueryDto } from '../../../../infrastructure/api/pagination/pagination-query.dto.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import type { ErrorDetail } from '../../../../shared/errors/error-detail.js';
import { ListPermissionsUseCase } from '../../application/use-cases/list-permissions.use-case.js';
import type { PermissionView } from '../../application/views/permission.view.js';
import { PaginatedPermissionsDto } from '../dto/paginated-permissions.dto.js';
import { PermissionResponseDto } from '../dto/permission-response.dto.js';

/**
 * The Permission catalog resource (IAM-004; FND-006; ADR-013).
 *
 * It exposes one read: the catalog of capabilities the platform defines. The
 * catalog is the platform's shared vocabulary — the same for every tenant — so
 * the read is deliberately **not** tenant-scoped: it reveals no tenant data, and
 * requiring a tenant to list the capabilities would suggest they differ per
 * tenant, which they must not. A tenant's choices are expressed by which keys its
 * roles hold, not by which permissions exist.
 *
 * **No authentication or authorization is implemented here, by design.** Listing
 * the catalog grants nothing and checks nothing: IAM-004 defines capabilities, it
 * does not enforce them (IAM-006 does).
 */
@ApiTags('permissions')
@Controller('permissions')
export class PermissionsController {
  public constructor(private readonly listPermissions: ListPermissionsUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'List the permission catalog using the standard pagination envelope',
    description:
      'The platform-wide capability vocabulary. Not tenant-scoped: every tenant sees the same capabilities.',
  })
  @ApiOkResponse({ type: PaginatedPermissionsDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Invalid pagination query.' })
  async list(@Query() query: PaginationQueryDto): Promise<Paginated<PermissionResponseDto>> {
    const outcome = await this.listPermissions.execute();

    return outcome.match<Paginated<PermissionResponseDto>>({
      ok: (permissions) => paginate(permissions.map(toPermissionResponse), query),
      fail: (error) => this.raise(error),
    });
  }

  /**
   * Turns a domain failure into the transport failure FND-006 defines for its
   * category. The catalog read cannot normally fail, so this exists to keep the
   * error contract total rather than to model an expected failure.
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

/** Maps the permission view to the response DTO. */
function toPermissionResponse(view: PermissionView): PermissionResponseDto {
  return {
    key: view.key,
    description: view.description,
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
