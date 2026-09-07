import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '../domain/ports/id-generator.port';

/** Production adapter for the IdGenerator port producing UUID v4 values. */
export class UuidIdGenerator implements IdGenerator {
  nextId(): string {
    return randomUUID();
  }
}
