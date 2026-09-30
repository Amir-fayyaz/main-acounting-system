import { ApiProperty } from '@nestjs/swagger';
import { MoneyDto } from '../../../api/serialization/money.dto.js';
import { EXAMPLE_ORIGINS, type ExampleOrigin } from './example-origin.js';

/**
 * Response body of the reference example endpoint (FND-006).
 *
 * Every common serialization case appears once: a UUID identifier, a string, an
 * enum, a nullable nested object, a nullable string and an ISO-8601 UTC
 * timestamp. A new module can use it as the worked example of the conventions.
 */
export class ExampleResponseDto {
  @ApiProperty({ description: 'Server-assigned UUID identifier.', format: 'uuid' })
  id!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty({ enum: EXAMPLE_ORIGINS })
  origin!: ExampleOrigin;

  @ApiProperty({
    description: 'Monetary value, or null when none was supplied.',
    type: () => MoneyDto,
    nullable: true,
  })
  amount!: MoneyDto | null;

  @ApiProperty({ description: 'Free-text note, or null.', type: String, nullable: true })
  note!: string | null;

  @ApiProperty({ description: 'Creation instant, ISO-8601 in UTC.', format: 'date-time' })
  createdAt!: string;
}
