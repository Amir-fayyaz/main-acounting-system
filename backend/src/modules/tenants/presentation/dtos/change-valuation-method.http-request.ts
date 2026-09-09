import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import type { InventoryValuationMethodValue } from '@modules/tenants/domain';

/** HTTP request body for PATCH /tenants/:id/valuation-method. */
export class ChangeValuationMethodHttpRequest {
  @ApiProperty({ description: 'Target inventory valuation policy', enum: ['FIFO', 'LIFO'], example: 'LIFO' })
  @IsString()
  @IsIn(['FIFO', 'LIFO'])
  readonly method!: InventoryValuationMethodValue;
}
