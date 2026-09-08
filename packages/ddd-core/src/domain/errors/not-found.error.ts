import { DomainError } from './domain.error';

/**
 * Thrown when an entity or aggregate referenced by an identifier does not
 * exist in the underlying store. Adapters translate this to a 404 response
 * at the API boundary.
 */
export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message, 'NOT_FOUND');
  }
}
