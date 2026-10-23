import { Body, Controller, HttpCode, HttpStatus, Inject, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Authorize } from '../../../../infrastructure/api/authorization/authorization-policy.js';
import { ApiErrorResponseDto } from '../../../../infrastructure/api/errors/api-error.dto.js';
import { ApiErrorException } from '../../../../infrastructure/api/errors/api-error.exception.js';
import { AUDIT_RECORDER } from '../../../audit/application/audit.tokens.js';
import type { AuditRecorder } from '../../../audit/application/ports/audit-recorder.port.js';
import { SelectActivePeriodUseCase } from '../../application/use-cases/select-active-period.use-case.js';
import { ClosePeriodUseCase } from '../../application/use-cases/close-period.use-case.js';
import { ReopenPeriodUseCase } from '../../application/use-cases/reopen-period.use-case.js';
import { ReopenPeriodDto } from '../dto/reopen-period.dto.js';
import { FiscalPeriodResponseDto } from '../dto/fiscal-period-response.dto.js';

@ApiTags('Fiscal Periods')
@ApiBearerAuth()
@Controller('fiscal-periods')
export class FiscalPeriodController {
  public constructor(
    private readonly selectActiveUseCase: SelectActivePeriodUseCase,
    private readonly closePeriodUseCase: ClosePeriodUseCase,
    private readonly reopenPeriodUseCase: ReopenPeriodUseCase,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorder,
  ) {}

  @Post(':id/select-active')
  @HttpCode(HttpStatus.OK)
  @Authorize({ permission: 'fiscal.manage' })
  @ApiOperation({ summary: 'Select an open period as the active period' })
  @ApiOkResponse({ type: FiscalPeriodResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  public async selectActive(@Param('id') id: string): Promise<FiscalPeriodResponseDto> {
    const result = await this.selectActiveUseCase.execute(id);
    if (result.isFail()) {
      const err = result.errorOrThrow();
      await this.audit.record({
        action: 'fiscal_period.select_active',
        outcome: 'failure',
        target: { type: 'fiscal_period', id },
        metadata: { error: err.code },
      });
      if (err.code === 'PERIOD_NOT_FOUND') {
        throw ApiErrorException.notFound(err.message);
      }
      throw new ApiErrorException(HttpStatus.CONFLICT, err.code, 'client', err.message);
    }

    const period = result.valueOrThrow();
    await this.audit.record({
      action: 'fiscal_period.select_active',
      outcome: 'success',
      target: { type: 'fiscal_period', id },
    });

    return period;
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @Authorize({ permission: 'fiscal.period.close' })
  @ApiOperation({ summary: 'Close an open period' })
  @ApiOkResponse({ type: FiscalPeriodResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  public async close(@Param('id') id: string): Promise<FiscalPeriodResponseDto> {
    const result = await this.closePeriodUseCase.execute(id);
    if (result.isFail()) {
      const err = result.errorOrThrow();
      await this.audit.record({
        action: 'fiscal_period.close',
        outcome: 'failure',
        target: { type: 'fiscal_period', id },
        metadata: { error: err.code },
      });
      if (err.code === 'PERIOD_NOT_FOUND') {
        throw ApiErrorException.notFound(err.message);
      }
      throw new ApiErrorException(HttpStatus.CONFLICT, err.code, 'client', err.message);
    }

    const period = result.valueOrThrow();
    await this.audit.record({
      action: 'fiscal_period.close',
      outcome: 'success',
      target: { type: 'fiscal_period', id },
    });

    return period;
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @Authorize({ permission: 'fiscal.period.reopen' })
  @ApiOperation({ summary: 'Reopen a closed period with a mandatory reason' })
  @ApiOkResponse({ type: FiscalPeriodResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  public async reopen(
    @Param('id') id: string,
    @Body() dto: ReopenPeriodDto,
  ): Promise<FiscalPeriodResponseDto> {
    const result = await this.reopenPeriodUseCase.execute(id, dto.reason);
    if (result.isFail()) {
      const err = result.errorOrThrow();
      await this.audit.record({
        action: 'fiscal_period.reopen',
        outcome: 'failure',
        target: { type: 'fiscal_period', id },
        metadata: { error: err.code, reason: dto.reason },
      });
      if (err.code === 'PERIOD_NOT_FOUND') {
        throw ApiErrorException.notFound(err.message);
      }
      if (err.code === 'REOPEN_REASON_REQUIRED') {
        throw new ApiErrorException(HttpStatus.BAD_REQUEST, err.code, 'validation', err.message);
      }
      throw new ApiErrorException(HttpStatus.CONFLICT, err.code, 'client', err.message);
    }

    const period = result.valueOrThrow();
    await this.audit.record({
      action: 'fiscal_period.reopen',
      outcome: 'success',
      target: { type: 'fiscal_period', id },
      metadata: { reason: dto.reason },
    });

    return period;
  }
}
