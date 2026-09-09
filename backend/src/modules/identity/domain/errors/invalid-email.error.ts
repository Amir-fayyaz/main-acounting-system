import { InvalidValueError } from '@shared/domain/invalid-value.error';

/**
 * Raised when a candidate email does not satisfy the structural rules of
 * the Email value object. Adapters map this to a 400 with the carried
 * message as the user-facing detail.
 */
export class InvalidEmailError extends InvalidValueError {}
