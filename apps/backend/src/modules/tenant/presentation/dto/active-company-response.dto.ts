import { ApiProperty } from '@nestjs/swagger';

/**
 * Response after selecting (or reading) the caller's active company.
 */
export class ActiveCompanyResponseDto {
  @ApiProperty({
    description: 'The company (tenant) the user selected as active.',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  tenantId!: string;

  @ApiProperty({
    description: 'The authenticated user who owns the preference.',
    format: 'uuid',
  })
  userId!: string;
}
