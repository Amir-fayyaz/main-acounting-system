import { ApiProperty } from '@nestjs/swagger';
import { SupplierResponseDto } from './supplier-response.dto.js';

/**
 * Successful response returned when a supplier is created (S5; HTTP 201).
 */
export class CreateSupplierSuccessResponseDto {
  @ApiProperty({
    description: 'Creation status indicator',
    example: 'created',
  })
  status!: 'created';

  @ApiProperty({
    description: 'The newly created supplier representation',
    type: () => SupplierResponseDto,
  })
  supplier!: SupplierResponseDto;
}
