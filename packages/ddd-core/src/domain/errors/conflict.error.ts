import { DomainError } from './domain.error';

/**
 * Thrown when an operation collides with the current persisted state — for
 * example, a unique-constraint violation, a duplicate number, or an
 * idempotency-key reuse. Adapters translate this to a 409 response.
 */
export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'CONFLICT');
  }
}
