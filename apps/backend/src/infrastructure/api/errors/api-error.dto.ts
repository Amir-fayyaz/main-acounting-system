import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * OpenAPI description of the standard error contract (FND-006).
 *
 * These classes exist only so the generated contract can show an error response;
 * the runtime body is built by `ApiExceptionFilter` from `ApiErrorBody`. They are
 * kept in sync with `api-error.types.ts` because they describe the same shape.
 */

export class ApiErrorDetailDto {
  @ApiProperty({ description: 'Dotted path of the offending input.', example: 'message' })
  field!: string;

  @ApiProperty({ description: 'Stable machine-readable reason.', example: 'isString' })
  code!: string;

  @ApiProperty({ description: 'Human-readable explanation.', example: 'message must be a string' })
  message!: string;
}

export class ApiErrorEnvelopeDto {
  @ApiProperty({ description: 'Stable error code.', example: 'VALIDATION_FAILED' })
  code!: string;

  @ApiProperty({
    description: 'Coarse failure category.',
    enum: ['validation', 'client', 'domain', 'technical'],
    example: 'validation',
  })
  category!: string;

  @ApiProperty({
    description: 'Message safe to show a user.',
    example: 'The request contains invalid values.',
  })
  message!: string;

  @ApiProperty({
    description: 'Identifier tying the response to the server-side log entry.',
    format: 'uuid',
    example: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
  })
  correlationId!: string;

  @ApiPropertyOptional({ type: () => [ApiErrorDetailDto], description: 'Field-level detail.' })
  details?: ApiErrorDetailDto[];
}

export class ApiErrorResponseDto {
  @ApiProperty({ type: () => ApiErrorEnvelopeDto })
  error!: ApiErrorEnvelopeDto;
}
