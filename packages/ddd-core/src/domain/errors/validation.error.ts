import { DomainError } from './domain.error';

/**
 * Thrown when input fails business-rule validation that is not covered by a
 * type-system check. Adapters translate this to a 400 response with the
 * carried message as the user-facing detail.
 */
export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}
