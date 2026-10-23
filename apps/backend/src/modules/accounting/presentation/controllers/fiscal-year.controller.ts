import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Authorize } from '../../../../infrastructure/api/authorization/authorization-policy.js';
import { ApiErrorResponseDto } from '../../../../infrastructure/api/errors/api-error.dto.js';
import { ApiErrorException } from '../../../../infrastructure/api/errors/api-error.exception.js';
import { AUDIT_RECORDER } from '../../../audit/application/audit.tokens.js';
import type { AuditRecorder } from '../../../audit/application/ports/audit-recorder.port.js';
import { CreateFiscalYear } from '../../application/commands/create-fiscal-year.command.js';
import { CreateFiscalYearUseCase } from '../../application/use-cases/create-fiscal-year.use-case.js';
import { GetFiscalYearUseCase } from '../../application/use-cases/get-fiscal-year.use-case.js';
import { ListFiscalYearsUseCase } from '../../application/use-cases/list-fiscal-years.use-case.js';
import { ListFiscalPeriodsUseCase } from '../../application/use-cases/list-fiscal-periods.use-case.js';
import { CreateFiscalYearDto } from '../dto/create-fiscal-year.dto.js';
import { FiscalYearResponseDto } from '../dto/fiscal-year-response.dto.js';
import { FiscalPeriodResponseDto } from '../dto/fiscal-period-response.dto.js';

@ApiTags('Fiscal Years')
@ApiBearerAuth()
@Controller('fiscal-years')
export class FiscalYearController {
  public constructor(
    private readonly createYearUseCase: CreateFiscalYearUseCase,
    private readonly getYearUseCase: GetFiscalYearUseCase,
    private readonly listYearsUseCase: ListFiscalYearsUseCase,
    private readonly listPeriodsUseCase: ListFiscalPeriodsUseCase,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorder,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Authorize({ permission: 'fiscal.manage' })
  @ApiOperation({ summary: 'Create a new fiscal year and generate its 12 periods' })
  @ApiCreatedResponse({ type: FiscalYearResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  public async create(@Body() dto: CreateFiscalYearDto): Promise<FiscalYearResponseDto> {
    const result = await this.createYearUseCase.execute(new CreateFiscalYear(dto));

    if (result.isFail()) {
      const err = result.errorOrThrow();
      await this.audit.record({
        action: 'fiscal_year.create',
        outcome: 'failure',
        metadata: { label: dto.label, error: err.code },
      });
      if (err.code === 'FISCAL_YEAR_OVERLAP' || err.code === 'FISCAL_YEAR_LABEL_DUPLICATE') {
        throw new ApiErrorException(HttpStatus.CONFLICT, err.code, 'client', err.message);
      }
      throw new ApiErrorException(HttpStatus.BAD_REQUEST, err.code, 'validation', err.message);
    }

    const year = result.valueOrThrow();
    await this.audit.record({
      action: 'fiscal_year.create',
      outcome: 'success',
      target: { type: 'fiscal_year', id: year.id },
      metadata: { label: year.label },
    });

    return year;
  }

  @Get()
  @Authorize({ permission: 'fiscal.read' })
  @ApiOperation({ summary: 'List all fiscal years of the company' })
  @ApiOkResponse({ type: [FiscalYearResponseDto] })
  public async list(): Promise<readonly FiscalYearResponseDto[]> {
    const result = await this.listYearsUseCase.execute();
    return result.valueOrThrow();
  }

  @Get(':id')
  @Authorize({ permission: 'fiscal.read' })
  @ApiOperation({ summary: 'Get details of a fiscal year' })
  @ApiOkResponse({ type: FiscalYearResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  public async getOne(@Param('id') id: string): Promise<FiscalYearResponseDto> {
    const result = await this.getYearUseCase.execute(id);
    if (result.isFail()) {
      throw ApiErrorException.notFound('Fiscal year was not found.');
    }
    return result.valueOrThrow();
  }

  @Get(':id/periods')
  @Authorize({ permission: 'fiscal.read' })
  @ApiOperation({ summary: 'List all periods of a fiscal year' })
  @ApiOkResponse({ type: [FiscalPeriodResponseDto] })
  public async listPeriods(@Param('id') id: string): Promise<readonly FiscalPeriodResponseDto[]> {
    const result = await this.listPeriodsUseCase.execute(id);
    return result.valueOrThrow();
  }
}
