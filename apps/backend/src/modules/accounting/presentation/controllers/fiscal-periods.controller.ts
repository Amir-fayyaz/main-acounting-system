import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Authorize } from '../../../../infrastructure/api/authorization/authorization-policy.js';
import { ApiErrorResponseDto } from '../../../../infrastructure/api/errors/api-error.dto.js';
import { ApiErrorException } from '../../../../infrastructure/api/errors/api-error.exception.js';
import {
  CurrentPrincipal,
  type AuthenticatedPrincipal,
} from '../../../../infrastructure/api/principal/current-principal.decorator.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { CloseFiscalPeriod } from '../../application/commands/close-fiscal-period.command.js';
import { ReopenFiscalPeriod } from '../../application/commands/reopen-fiscal-period.command.js';
import { SelectActivePeriod } from '../../application/commands/select-active-period.command.js';
import { CloseFiscalPeriodUseCase } from '../../application/use-cases/close-fiscal-period.use-case.js';
import { ReopenFiscalPeriodUseCase } from '../../application/use-cases/reopen-fiscal-period.use-case.js';
import { SelectActivePeriodUseCase } from '../../application/use-cases/select-active-period.use-case.js';
import { isTenantReference } from '../../domain/value-objects/tenant-reference.js';
import {
  FiscalPeriodResponseDto,
  toFiscalPeriodResponse,
} from '../dto/fiscal-period-response.dto.js';
import { ReopenFiscalPeriodDto } from '../dto/reopen-fiscal-period.dto.js';

/**
 * The fiscal period command resource (FIS-004; FIS-005; FND-006; ADR-013).
 *
 * Modelled on `RolesController` (`identity/presentation`): the resource is
 * nested under the tenant (`/tenants/:tenantId/fiscal-periods`), the three
 * operations are use-case verbs on the period resource
 * (`POST /{periodId}/select-active`, `/{periodId}/close`, `/{periodId}/reopen`
 * — ADR-013 section 3), and every handler only validates input through the
 * global pipe, delegates to a use case and maps the outcome to a DTO.
 *
 * **Role guard.** Close and reopen are refused for callers without the role
 * FIS-005 already checks: the endpoint declares
 * `@Authorize({ permission: 'accounting.period.manage' })` and the authorization
 * boundary decides before the handler runs, while the use case re-checks the
 * very same capability through the published `Authorization` contract — so the
 * rule holds whether the call arrives over HTTP or from another entry point.
 * A refusal is audited either way (the boundary records `authorization.denied`;
 * the use case records `accounting.period.close` / `accounting.period.reopen`
 * with outcome `denied`).
 *
 * **Tenant.** The tenant comes from the tenant context only — verified
 * membership, then the ambient scope — never from the body. Every write goes
 * through its use case, which records the Audit entry inside the same
 * transaction as the state change (AUD-001).
 *
 * **Error contract.** A failed outcome is rethrown as the `DomainError` it is,
 * so the shared exception filter serializes the module's own fiscal code with
 * the HTTP status of its category (doc 13): `PERIOD_STATE_INVALID` answers 409,
 * `FISCAL_PERIOD_NOT_FOUND` 404, `REOPEN_REASON_REQUIRED` 400,
 * `FISCAL_PERIOD_NOT_OPEN` 422.
 */
@ApiBearerAuth()
@ApiTags('fiscal-periods')
@Controller('tenants/:tenantId/fiscal-periods')
export class FiscalPeriodsController {
  public constructor(
    private readonly selectActivePeriod: SelectActivePeriodUseCase,
    private readonly closeFiscalPeriod: CloseFiscalPeriodUseCase,
    private readonly reopenFiscalPeriod: ReopenFiscalPeriodUseCase,
  ) {}

  @Post(':periodId/select-active')
  @Authorize({ permission: 'accounting.period.manage', tenantParam: 'tenantId' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Select the active period',
    description:
      "Moves the company's single active-period pointer to this period. Requires an active " +
      'membership in the tenant with "accounting.period.manage". Only an open period may become ' +
      'active: a closed one is refused with FISCAL_PERIOD_NOT_OPEN (422).',
  })
  @ApiOkResponse({
    type: FiscalPeriodResponseDto,
    description: 'The period is now the active one.',
    examples: {
      selected: {
        summary: 'The selected period',
        value: {
          id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f80',
          tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71',
          fiscalYearId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
          jalaliYear: 1405,
          sequence: 1,
          startDate: '2026-03-21',
          endDate: '2026-04-19',
          state: 'open',
          createdAt: '2026-11-01T09:30:00.000Z',
          updatedAt: '2026-11-01T09:30:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'The path identifier is not a well-formed fiscal period id.',
    examples: {
      invalidId: {
        summary: 'A malformed id',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'periodId',
                code: 'FISCAL_PERIOD_ID_INVALID',
                message: 'periodId must be a well-formed id',
              },
            ],
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
    examples: {
      unauthenticated: {
        summary: 'No valid bearer token',
        value: {
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            category: 'client',
            message: 'Authentication is required.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'The caller lacks "accounting.period.manage" or has no membership in the company.',
    examples: {
      missingPermission: {
        summary: 'A member without the capability',
        value: {
          error: {
            code: 'AUTHORIZATION_DENIED',
            category: 'client',
            message: 'The authenticated principal is not authorized to perform this operation.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'permission',
                code: 'PERMISSION_REQUIRED',
                message: 'the operation requires "accounting.period.manage"',
              },
            ],
          },
        },
      },
      notAMember: {
        summary: 'The caller is not a member of the company',
        value: {
          error: {
            code: 'TENANT_ACCESS_DENIED',
            category: 'client',
            message: 'The authenticated principal cannot access this tenant.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'No fiscal period with that identity exists for this company.',
    examples: {
      notFound: {
        summary: 'Unknown or foreign period id',
        value: {
          error: {
            code: 'FISCAL_PERIOD_NOT_FOUND',
            category: 'domain',
            message: 'No fiscal period with that identity exists.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                code: 'FISCAL_PERIOD_NOT_FOUND',
                field: 'periodId',
                message: 'periodId does not name a fiscal period of this company',
              },
            ],
          },
        },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'The period is closed, so it cannot become the active one.',
    examples: {
      closedPeriod: {
        summary: 'A closed period was selected',
        value: {
          error: {
            code: 'FISCAL_PERIOD_NOT_OPEN',
            category: 'domain',
            message: 'Only an open period can be the active one.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  async selectActive(
    @Param('tenantId') tenantId: string,
    @Param('periodId') periodId: string,
  ): Promise<FiscalPeriodResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.selectActivePeriod.execute(new SelectActivePeriod({ periodId })),
    );

    return outcome.match<FiscalPeriodResponseDto>({
      ok: toFiscalPeriodResponse,
      fail: (error) => this.raise(error),
    });
  }

  @Post(':periodId/close')
  @Authorize({ permission: 'accounting.period.manage', tenantParam: 'tenantId' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Close a fiscal period',
    description:
      'Closes an open period so it stops accepting postings. Requires an active membership in the ' +
      'tenant with "accounting.period.manage" — callers without the role are refused (403) and the ' +
      'refusal is audited. A period that is already closed, or the currently active one, is refused ' +
      'with PERIOD_STATE_INVALID (409). The close is recorded in the audit trail.',
  })
  @ApiOkResponse({
    type: FiscalPeriodResponseDto,
    description: 'The period is now closed.',
    examples: {
      closed: {
        summary: 'The closed period',
        value: {
          id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f80',
          tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71',
          fiscalYearId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
          jalaliYear: 1405,
          sequence: 1,
          startDate: '2026-03-21',
          endDate: '2026-04-19',
          state: 'closed',
          createdAt: '2026-11-01T09:30:00.000Z',
          updatedAt: '2026-11-01T10:15:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'The path identifier is not a well-formed fiscal period id.',
    examples: {
      invalidId: {
        summary: 'A malformed id',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'periodId',
                code: 'FISCAL_PERIOD_ID_INVALID',
                message: 'periodId must be a well-formed id',
              },
            ],
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
    examples: {
      unauthenticated: {
        summary: 'No valid bearer token',
        value: {
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            category: 'client',
            message: 'Authentication is required.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'The caller lacks "accounting.period.manage" or has no membership in the company.',
    examples: {
      missingPermission: {
        summary: 'A member without the capability — the refusal is audited',
        value: {
          error: {
            code: 'AUTHORIZATION_DENIED',
            category: 'client',
            message: 'The authenticated principal is not authorized to perform this operation.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'permission',
                code: 'PERMISSION_REQUIRED',
                message: 'the operation requires "accounting.period.manage"',
              },
            ],
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'No fiscal period with that identity exists for this company.',
    examples: {
      notFound: {
        summary: 'Unknown or foreign period id',
        value: {
          error: {
            code: 'FISCAL_PERIOD_NOT_FOUND',
            category: 'domain',
            message: 'No fiscal period with that identity exists.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The period cannot be closed from its current state.',
    examples: {
      alreadyClosed: {
        summary: 'The period is already closed',
        value: {
          error: {
            code: 'PERIOD_STATE_INVALID',
            category: 'domain',
            message: 'The fiscal period is already closed.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
      stillActive: {
        summary: 'The period is the active one — select another first',
        value: {
          error: {
            code: 'PERIOD_STATE_INVALID',
            category: 'domain',
            message:
              'The active period cannot be closed while active. Select another open period first.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  async close(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('tenantId') tenantId: string,
    @Param('periodId') periodId: string,
  ): Promise<FiscalPeriodResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.closeFiscalPeriod.execute(new CloseFiscalPeriod({ periodId, principal })),
    );

    return outcome.match<FiscalPeriodResponseDto>({
      ok: toFiscalPeriodResponse,
      fail: (error) => this.raise(error),
    });
  }

  @Post(':periodId/reopen')
  @Authorize({ permission: 'accounting.period.manage', tenantParam: 'tenantId' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reopen a closed fiscal period with a reason',
    description:
      'Reopens a closed period so it can accept postings again. Requires an active membership in ' +
      'the tenant with "accounting.period.manage" — callers without the role are refused (403) and ' +
      'the refusal is audited. A non-empty business justification is required by the domain: a ' +
      'missing or blank reason is refused with REOPEN_REASON_REQUIRED (400). A period that is ' +
      'already open is refused with PERIOD_STATE_INVALID (409). The reopen, including its reason, ' +
      'is recorded in the audit trail.',
  })
  @ApiOkResponse({
    type: FiscalPeriodResponseDto,
    description: 'The period is open again.',
    examples: {
      reopened: {
        summary: 'The reopened period',
        value: {
          id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f80',
          tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71',
          fiscalYearId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
          jalaliYear: 1405,
          sequence: 1,
          startDate: '2026-03-21',
          endDate: '2026-04-19',
          state: 'open',
          createdAt: '2026-11-01T09:30:00.000Z',
          updatedAt: '2026-11-01T11:00:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'The reason is missing or blank, or the path identifier is malformed.',
    examples: {
      missingReason: {
        summary: 'No reason was supplied',
        value: {
          error: {
            code: 'REOPEN_REASON_REQUIRED',
            category: 'domain',
            message: 'A non-empty reason is required to reopen a closed fiscal period.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                code: 'REOPEN_REASON_REQUIRED',
                field: 'reason',
                message: 'reason must be a non-empty string',
              },
            ],
          },
        },
      },
      invalidId: {
        summary: 'A malformed period id',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'periodId',
                code: 'FISCAL_PERIOD_ID_INVALID',
                message: 'periodId must be a well-formed id',
              },
            ],
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
    examples: {
      unauthenticated: {
        summary: 'No valid bearer token',
        value: {
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            category: 'client',
            message: 'Authentication is required.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'The caller lacks "accounting.period.manage" or has no membership in the company.',
    examples: {
      missingPermission: {
        summary: 'A member without the capability — the refusal is audited',
        value: {
          error: {
            code: 'AUTHORIZATION_DENIED',
            category: 'client',
            message: 'The authenticated principal is not authorized to perform this operation.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'permission',
                code: 'PERMISSION_REQUIRED',
                message: 'the operation requires "accounting.period.manage"',
              },
            ],
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'No fiscal period with that identity exists for this company.',
    examples: {
      notFound: {
        summary: 'Unknown or foreign period id',
        value: {
          error: {
            code: 'FISCAL_PERIOD_NOT_FOUND',
            category: 'domain',
            message: 'No fiscal period with that identity exists.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The period cannot be reopened from its current state.',
    examples: {
      alreadyOpen: {
        summary: 'The period is already open',
        value: {
          error: {
            code: 'PERIOD_STATE_INVALID',
            category: 'domain',
            message: 'The fiscal period is already open.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  async reopen(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('tenantId') tenantId: string,
    @Param('periodId') periodId: string,
    @Body() body: ReopenFiscalPeriodDto,
  ): Promise<FiscalPeriodResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.reopenFiscalPeriod.execute(
        new ReopenFiscalPeriod({ periodId, reason: body.reason ?? '', principal }),
      ),
    );

    return outcome.match<FiscalPeriodResponseDto>({
      ok: toFiscalPeriodResponse,
      fail: (error) => this.raise(error),
    });
  }

  /**
   * Checks that the route carries a well-formed tenant identifier and then
   * runs `work` under the tenant scope the trusted boundary published.
   *
   * The scope itself is established once, by the global tenant-scope
   * interceptor, from the tenant the authorization boundary proved for this
   * caller's membership (IAM-007). This helper therefore establishes nothing:
   * it refuses a malformed route identifier as not-found and lets the
   * established scope stand, so the use case's own tenant comparison decides
   * whether a period may be touched.
   */
  private async inTenantScope<T>(rawId: string, work: () => Promise<T>): Promise<T> {
    if (!isTenantReference(rawId)) {
      throw ApiErrorException.notFound();
    }

    return work();
  }

  /**
   * Rethrows a failed outcome as the `DomainError` it is.
   *
   * The shared exception filter maps the failure's *category* to the HTTP
   * status of doc 13 (409 conflict, 404 not found, 400 validation, 422 domain)
   * and serializes the module's own code verbatim. Nothing is folded into a
   * generic infrastructure code here — `PERIOD_STATE_INVALID`,
   * `REOPEN_REASON_REQUIRED` and `FISCAL_PERIOD_NOT_FOUND` are this resource's
   * contract.
   */
  private raise(error: DomainError): never {
    throw error;
  }
}
