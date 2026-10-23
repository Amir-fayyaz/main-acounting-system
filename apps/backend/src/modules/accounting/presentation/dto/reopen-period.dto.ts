import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReopenPeriodDto {
  @ApiProperty({
    description: 'Mandatory reason for reopening a closed period.',
    example: 'Correction of adjustment entry',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
