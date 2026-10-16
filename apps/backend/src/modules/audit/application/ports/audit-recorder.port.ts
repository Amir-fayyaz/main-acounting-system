/**
 * The application-level audit contract other modules record through (AUD-001;
 * ADR-003 section 21).
 *
 * This is the one thing the Audit capability publishes to the rest of the
 * system, and it is deliberately poor: a caller states *what* happened, *who*
 * did it, *to what*, *how it ended* and the context that belongs with it — and
 * learns nothing about the record, the table, the repository or the read port
 * behind it. The shape is an entry, not an aggregate: a consumer depends on
 * the published contract (ADR-002, section 12), never on audit internals.
 *
 * Three things are *not* on the entry, and each is a deliberate refusal:
 *
 * - **No tenant.** The tenant of a fact is the ambient tenant scope the
 *   operation ran under (SHR-007), applied by the recorder — never a field a
 *   caller supplies. A caller with no scope writes a platform-level fact, which
 *   is exactly right for a sign-in that grants no company access.
 * - **No actor from the client.** `actorUserId` is resolved by the application:
 *   it is the identity the caller already resolved — or, when omitted, the
 *   ambient actor scope the HTTP boundary established from the verified
 *   principal (SHR-007; `ActorScope`). An omitted id on a request with no
 *   principal means "the system acted", which the record states as such.
 * - **No secret, by construction.** `metadata` is sanitized before the record
 *   exists, so credential material (a password, a token, a key) can never reach
 *   the trail even if a caller passes it by mistake. A secret that must survive
 *   redaction has no home on this contract.
 *
 * A record is append-only: there is no `update`, no delete, no upsert. What a
 * caller can do with the contract is state one fact durably.
 */

/** What a consuming module states about a fact it wants recorded. */
export interface AuditEntry {
  /** What happened, in the owning module's action naming convention. */
  readonly action: string;
  /** How the operation ended: `success`, `failure` or `denied`. */
  readonly outcome: string;
  /**
   * The acting user's stable identity, resolved by the application. Omitted
   * means "use the ambient actor scope"; when neither is present, the fact is
   * recorded as the system acting.
   */
  readonly actorUserId?: string;
  /** The resource the operation addressed, when it addressed one. */
  readonly target?: { readonly type: string; readonly id: string };
  /** Context to store after sanitization; secrets in it are redacted, never stored. */
  readonly metadata?: unknown;
  /** When it happened; defaults to "now" when the caller does not state one. */
  readonly occurredAt?: Date;
  /** The flow this fact belongs to, when the caller had one. */
  readonly correlationId?: string;
  /** The direct cause of this fact, when the caller had one. */
  readonly causationId?: string;
}

/**
 * The audit write contract (AUD-001).
 *
 * Implemented by the Audit capability's recording use case and injected
 * application-wide (`AUDIT_RECORDER`), so a consumer records a fact without ever
 * touching the audit table, its repository or its read port. Recording joins the
 * caller's transaction when one is open, and opens its own when it is not — so
 * an auditable business change and its audit record commit together, while a
 * security fact that changed no state (a failed sign-in, a refused request) is
 * still recorded.
 */
export interface AuditRecorder {
  record(entry: AuditEntry): Promise<void>;
}
