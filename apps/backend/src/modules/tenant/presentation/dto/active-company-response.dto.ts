import { ApiProperty } from '@nestjs/swagger';

/**
 * Response body for selecting a company (IAM-009).
 *
 * It echoes the company the user is now working in and when the selection was
 * recorded. It carries no permissions: they are resolved per request and can
 * change, so a stored snapshot would be misleading.
 */
export class ActiveCompanyResponseDto {
  @ApiProperty({
    description: 'The company the caller selected as active.',
    format: 'uuid',
    example: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
  })
  tenantId!: string;

  @ApiProperty({
    description: 'When the selection was recorded, ISO-8601 in UTC.',
    format: 'date-time',
    example: '2026-10-24T09:30:00.000Z',
  })
  selectedAt!: string;
}
