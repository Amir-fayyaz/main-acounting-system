/**
 * Base class for domain-layer errors. The machine-readable `code` lets
 * adapters map failures to API/transport error envelopes without coupling the
 * domain to a specific protocol. `code` is a stable string per error class;
 * applications may narrow it with their own union types.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string = 'INTERNAL_ERROR',
  ) {
    super(message);
    this.name = new.target.name;
  }
}
