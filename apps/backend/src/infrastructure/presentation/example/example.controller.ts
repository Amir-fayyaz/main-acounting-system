import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../api/authorization/authorization-policy.js';
import { ApiErrorException } from '../../api/errors/api-error.exception.js';
import { ApiErrorResponseDto } from '../../api/errors/api-error.dto.js';
import type { Paginated } from '../../api/pagination/pagination.js';
import { PaginationQueryDto } from '../../api/pagination/pagination-query.dto.js';
import { AppConfigService } from '../../config/app-config.service.js';
import { CreateExampleDto } from './dto/create-example.dto.js';
import { ExampleResponseDto } from './dto/example-response.dto.js';
import { PaginatedExamplesDto } from './dto/paginated-examples.dto.js';
import { ExampleService } from './example.service.js';

/**
 * Reference example resource (FND-006).
 *
 * Every future module copies the *structure* of this controller: it delegates to
 * a service, takes validated DTOs, returns DTOs (never a domain entity) and
 * throws the shared error type. The resource itself is not a business domain —
 * it is the smallest endpoint that exercises validation, a success response, the
 * error contract, pagination and the generated OpenAPI document.
 *
 * The path carries no version segment: the default API version is applied
 * globally in `bootstrap.ts`, so every module is versioned identically
 * (ADR-013, section 4).
 *
 * The resource is `@Public()` because it is a reference template rather than a
 * business capability: it owns no tenant data and no user data, so there is
 * nothing to authorize. A real module copies this controller's *structure* and
 * replaces this declaration with the capability it requires (IAM-006).
 */
@Public()
@ApiTags('examples')
@Controller('examples')
export class ExampleController {
  constructor(
    private readonly examples: ExampleService,
    private readonly config: AppConfigService,
  ) {}

  @Get('probe/server-error')
  @ApiOperation({
    summary: 'Development-only probe that raises an unexpected error',
    description:
      'Exposes the standard 500 response. It is not registered for a production installation (which returns the standard not-found error instead) and does no work.',
  })
  @ApiInternalServerErrorResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  probeServerError(): never {
    if (this.config.environment.isProduction) {
      throw ApiErrorException.notFound();
    }

    // A bug in disguise: the message must never reach the caller. The filter
    // maps it to a generic 500 and logs this detail (redacted) server-side.
    throw new Error('FND-006 server-error probe: internal detail that must never be serialized');
  }

  @Post()
  @ApiOperation({ summary: 'Create a reference example from a validated request body' })
  @ApiCreatedResponse({ type: ExampleResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  create(@Body() request: CreateExampleDto): ExampleResponseDto {
    return this.examples.create(request);
  }

  @Get()
  @ApiOperation({ summary: 'List reference examples using the standard pagination envelope' })
  @ApiOkResponse({ type: PaginatedExamplesDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Invalid pagination query.' })
  list(@Query() query: PaginationQueryDto): Paginated<ExampleResponseDto> {
    return this.examples.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch one reference example' })
  @ApiOkResponse({ type: ExampleResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  findOne(@Param('id') id: string): ExampleResponseDto {
    const example = this.examples.findById(id);

    if (example === undefined) {
      throw ApiErrorException.notFound();
    }

    return example;
  }
}
