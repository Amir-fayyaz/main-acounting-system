import { DomainError } from './domain.error';

/** Thrown when a value object or factory receives an invalid value. */
export class InvalidValueError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_VALUE');
  }
}
