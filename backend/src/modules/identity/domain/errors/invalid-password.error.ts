import { InvalidValueError } from '@shared/domain/invalid-value.error';

/**
 * Raised when a candidate password hash does not satisfy the structural
 * rules of the PasswordHash value object (empty input, unsupported
 * algorithm prefix, malformed length).
 *
 * Note: this guards the *hash envelope*, not the plaintext — domain code
 * never receives plaintext passwords. The application layer feeds hashes
 * produced by a PasswordHasherPort adapter.
 */
export class InvalidPasswordError extends InvalidValueError {}
