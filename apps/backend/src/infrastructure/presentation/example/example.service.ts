import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { paginate, type Paginated } from '../../api/pagination/pagination.js';
import type { PaginationQueryDto } from '../../api/pagination/pagination-query.dto.js';
import { toIsoDateTime } from '../../api/serialization/serialization.js';
import type { CreateExampleDto } from './dto/create-example.dto.js';
import type { ExampleResponseDto } from './dto/example-response.dto.js';

/**
 * In-memory store behind the reference example endpoint (FND-006).
 *
 * It holds reference items only — no domain rule, no persistence, no tenant
 * scope — so the API baseline can be exercised end to end (validation, success,
 * pagination, serialization) without introducing a business module. It is
 * replaced, not extended, by the first real module.
 */
@Injectable()
export class ExampleService {
  private readonly examples = new Map<string, ExampleResponseDto>();

  constructor() {
    this.seed();
  }

  create(request: CreateExampleDto): ExampleResponseDto {
    const example: ExampleResponseDto = {
      id: randomUUID(),
      message: request.message,
      origin: 'created',
      amount: request.amount ?? null,
      note: request.note ?? null,
      createdAt: toIsoDateTime(new Date()),
    };

    this.examples.set(example.id, example);

    return example;
  }

  list(query: PaginationQueryDto): Paginated<ExampleResponseDto> {
    return paginate([...this.examples.values()], query);
  }

  findById(id: string): ExampleResponseDto | undefined {
    return this.examples.get(id);
  }

  private seed(): void {
    const seeded: readonly Pick<ExampleResponseDto, 'message' | 'note' | 'amount'>[] = [
      {
        message: 'reference example',
        note: 'seeded so the collection is never empty',
        amount: { amount: '1000.00', currency: 'IRR' },
      },
      { message: 'second reference example', note: null, amount: null },
    ];

    for (const item of seeded) {
      const example: ExampleResponseDto = {
        id: randomUUID(),
        message: item.message,
        origin: 'seed',
        amount: item.amount,
        note: item.note,
        createdAt: toIsoDateTime(new Date()),
      };

      this.examples.set(example.id, example);
    }
  }
}
