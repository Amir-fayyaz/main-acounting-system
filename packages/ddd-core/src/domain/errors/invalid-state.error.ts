import { DomainError } from './domain.error';

/** Thrown when a state transition is not allowed for the current state. */
export class InvalidStateError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_STATE');
  }
}
