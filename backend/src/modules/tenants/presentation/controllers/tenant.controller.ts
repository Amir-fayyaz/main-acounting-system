import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  ChangeTenantValuationMethodUseCase,
  ChangeValuationMethodCommand,
  CreateTenantCommand,
  CreateTenantUseCase,
  DeactivateTenantUseCase,
} from '@modules/tenants/application';
import { tenantId } from '@modules/tenants/domain';
import { ChangeValuationMethodHttpRequest } from '../dtos/change-valuation-method.http-request';
import { CreateTenantHttpRequest } from '../dtos/create-tenant.http-request';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantController {
  constructor(
    private readonly createTenant: CreateTenantUseCase,
    private readonly changeValuationMethod: ChangeTenantValuationMethodUseCase,
    private readonly deactivateTenant: DeactivateTenantUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a tenant' })
  @ApiCreatedResponse({ description: 'Tenant created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid tenant data' })
  async create(@Body() request: CreateTenantHttpRequest) {
    return this.createTenant.execute(
      new CreateTenantCommand(
        request.shopName,
        request.legalName,
        request.nationalId,
        request.baseCurrency,
        request.subscriptionPlan,
      ),
    );
  }

  @Patch(':id/valuation-method')
  @ApiOperation({ summary: 'Change a tenant inventory valuation method' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Tenant UUID' })
  @ApiOkResponse({ description: 'Valuation method changed successfully' })
  @ApiBadRequestResponse({ description: 'Invalid tenant id or valuation method' })
  async changeValuation(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() request: ChangeValuationMethodHttpRequest,
  ) {
    return this.changeValuationMethod.execute(new ChangeValuationMethodCommand(tenantId(id), request.method));
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a tenant' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Tenant UUID' })
  @ApiOkResponse({ description: 'Tenant deactivated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid tenant id' })
  async deactivate(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.deactivateTenant.execute(tenantId(id));
  }
}
