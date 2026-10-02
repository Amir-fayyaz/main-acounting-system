/**
 * The refusal raised when a tenant-scoped operation finds no tenant context
 * (SHR-007; ADR-001 section 13, ADR-008 section 14, ADR-010 section 13).
 *
 * Fail closed: an unknown or absent scope means *no* operation, never a
 * fallback to "all data" or to whatever id happens to be nearby. The error is
 * a precondition of execution rather than a business outcome, so it is a plain
 * thrown error (like `OutboxTransactionRequiredError` for the transaction
 * boundary), not a `Result` failure the business decided about.
 *
 * `state` records which refusal occurred, so a test — or a later
 * presentation-layer mapping — can tell "no scope was ever established" from
 * "the caller deliberately chose the system scope".
 */
export class TenantContextMissingError extends Error {
  /** Stable identifier of this failure, mirroring the `DomainError` code shape. */
  public readonly code = 'TENANT_CONTEXT_MISSING';
  /** Which absence caused the refusal. */
  public readonly state: 'missing' | 'system';

  constructor(state: 'missing' | 'system') {
    super(
      state === 'system'
        ? 'A tenant-scoped operation cannot run under an explicit system scope; ' +
            'establish a tenant context first.'
        : 'A tenant-scoped operation cannot run without an established tenant context; ' +
            'establish one from a trusted boundary first.',
    );
    this.name = new.target.name;
    this.state = state;
  }
}
