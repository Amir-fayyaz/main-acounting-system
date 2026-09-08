import { DomainError } from './domain.error';

/**
 * Thrown when a request fails authentication — missing, invalid, or expired
 * credentials. Adapters translate this to a 401 response.
 *
 * For authorization failures (authenticated but not permitted), use the
 * dedicated authorization error surfaced at the presentation layer instead.
 */
export class UnauthorizedError extends DomainError {
  constructor(message: string) {
    super(message, 'UNAUTHENTICATED');
  }
}
