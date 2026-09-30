import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../api/pagination/pagination.js';
import { ExampleResponseDto } from './example-response.dto.js';

/**
 * The pagination envelope of the example collection (FND-006).
 *
 * `Paginated<T>` in `api/pagination` is the reusable shape; a concrete class is
 * declared here only because a generic type cannot be described in the generated
 * OpenAPI document without one.
 */
export class PaginatedExamplesDto {
  @ApiProperty({ type: () => [ExampleResponseDto] })
  data!: ExampleResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;
}
