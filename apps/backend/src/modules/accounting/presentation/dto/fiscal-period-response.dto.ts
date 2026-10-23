import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FiscalPeriodResponseDto {
  @ApiProperty({ example: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f80' })
  id!: string;

  @ApiProperty({ example: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71' })
  tenantId!: string;

  @ApiProperty({ example: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70' })
  fiscalYearId!: string;

  @ApiProperty({ example: 1 })
  sequenceNumber!: number;

  @ApiProperty({ example: 'فروردین' })
  label!: string;

  @ApiProperty({ example: '2024-03-20' })
  startDate!: string;

  @ApiProperty({ example: '2024-04-19' })
  endDate!: string;

  @ApiProperty({ example: 'open', enum: ['open', 'closed'] })
  status!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiPropertyOptional({ example: 'Correction needed' })
  reopenReason?: string;

  @ApiProperty({ example: 1 })
  revision!: number;

  @ApiProperty({ example: '2026-10-01T08:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-10-01T08:00:00.000Z' })
  updatedAt!: string;
}
