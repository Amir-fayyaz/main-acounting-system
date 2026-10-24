import type { DateTime } from '../../../../shared/time/date-time.js';
import { assertOpaqueIdentifier } from '../audit-identifiers.js';
import { AuditActor, type AuditActorType } from '../value-objects/audit-actor.js';
import { AuditAction } from '../value-objects/audit-action.js';
import { AuditOutcome, type AuditOutcomeValue } from '../value-objects/audit-outcome.js';
import { AuditTarget } from '../value-objects/audit-target.js';
import { type AuditMetadata, sanitizeAuditMetadata } from '../value-objects/audit-metadata.js';
import {
  auditRecordIdFrom,
  generateAuditRecordId,
  type AuditRecordId,
} from '../value-objects/audit-record-id.js';

/**
 * One persistent audit fact (AUD-001; ADR-003 section 21; ADR-010 section 9;
 * ADR-015 section 6).
 *
 * A record answers the questions the architecture requires of an audit trail —
 * *who*, *for which company*, *when*, *what operation*, *on which object*, and
 * *with what outcome* — and it answers them as **data**, not as a log line
 * (ADR-015 section 6: a log does not replace audit).
 *
 * ```text
 * id            this record
 * tenantId      the company it belongs to            (absent for platform-level facts)
 * actor         the user who acted, or the system     (never both, never neither)
 * action        what happened, as a stable name       (user.signed_in, purchase.approved)
 * target        what it happened to                   (absent when nothing was addressed)
 * outcome       success | failure | denied
 * occurredAt    when
 * correlationId / causationId   how it is tied to the flow that caused it
 * metadata      sanitized context, and nothing else
 * ```
 *
 * Four properties are load-bearing, and each is a deliberate refusal:
 *
 * - **It is immutable.** The instance is frozen and exposes no operation that
 *   changes a field; there is no `update` and no setter, and the persistence
 *   port it is written through offers no way to rewrite one (SHR-004 ships no
 *   delete and no upsert). An audit trail that could be edited after the fact
 *   would not be an audit trail.
 * - **It is tenant-aware, not client-aware.** `tenantId` is a *resolved* value —
 *   the tenant context the operation actually ran under (SHR-007) — and the
 *   record has no notion of a claimed tenant. Platform-level facts (a sign-in,
 *   a documented authorization denial before any tenant scope exists) carry no
 *   tenant at all rather than a guess.
 * - **It never stores a secret.** Context passes through
 *   {@link sanitizeAuditMetadata} on the way in, and the record's own fields
 *   hold identity, action and outcome only. Nothing on this class carries a
 *   password, a token, a digest or a key.
 * - **It carries no business rule.** The action name is opaque to this module
 *   and the target is an uninterpreted reference, so the same record serves
 *   identity, tenant, accounting, inventory, purchase and agent facts without
 *   the Audit capability learning any of their vocabulary (ADR-002, section 11).
 *
 * The class is framework-free: it imports the shared kernel and its own module
 * only — never a transport, an ORM or the ambient tenant scope
 * (`src/modules/module-boundaries.spec.ts`).
 */

/** The plain state of an audit record, as storage and mapping see it. */
export interface AuditRecordSnapshot {
  readonly id: string;
  readonly tenantId?: string;
  readonly actorType: AuditActorType;
  readonly actorUserId?: string;
  readonly action: string;
  readonly targetType?: string;
  readonly targetId?: string;
  readonly outcome: AuditOutcomeValue;
  readonly occurredAt: DateTime;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly metadata: AuditMetadata;
}

/** What must be stated to append a record. */
export interface CreateAuditRecordInput {
  /** What happened, in the owning module's action naming convention. */
  readonly action: AuditAction;
  /** How the operation ended. */
  readonly outcome: AuditOutcome;
  /** Who acted: an authenticated user, or the system itself. */
  readonly actor: AuditActor;
  /** When it happened, supplied by the application so the domain reads no clock. */
  readonly occurredAt: DateTime;
  /** The resolved tenant the operation ran under; absent for platform-level facts. */
  readonly tenantId?: string;
  /** The resource the operation addressed; absent when there was none. */
  readonly target?: AuditTarget;
  /** The flow this fact belongs to, when the caller had one. */
  readonly correlationId?: string;
  /** The direct cause of this fact, when the caller had one. */
  readonly causationId?: string;
  /** Context to store after sanitization; secrets in it are redacted, never stored. */
  readonly metadata?: unknown;
  /** An explicit identity, for rehydration-style tests. */
  readonly id?: AuditRecordId;
}

export class AuditRecord {
  /** The record's own identity. */
  public readonly id: AuditRecordId;

  /** The resolved tenant the operation ran under, when there was one. */
  public readonly tenantId?: string;

  /** Who acted. */
  public readonly actor: AuditActor;

  /** What happened. */
  public readonly action: AuditAction;

  /** What it happened to, when it addressed a resource. */
  public readonly target?: AuditTarget;

  /** How the operation ended. */
  public readonly outcome: AuditOutcome;

  /** When it happened. */
  public readonly occurredAt: DateTime;

  /** The flow this fact belongs to, when it is known. */
  public readonly correlationId?: string;

  /** The direct cause of this fact, when it is known. */
  public readonly causationId?: string;

  /** The sanitized context; never contains credential material. */
  public readonly metadata: AuditMetadata;

  private constructor(input: {
    readonly id: AuditRecordId;
    readonly tenantId?: string;
    readonly actor: AuditActor;
    readonly action: AuditAction;
    readonly target?: AuditTarget;
    readonly outcome: AuditOutcome;
    readonly occurredAt: DateTime;
    readonly correlationId?: string;
    readonly causationId?: string;
    readonly metadata: AuditMetadata;
  }) {
    this.id = input.id;
    this.tenantId = input.tenantId;
    this.actor = input.actor;
    this.action = input.action;
    this.target = input.target;
    this.outcome = input.outcome;
    this.occurredAt = input.occurredAt;
    this.correlationId = input.correlationId;
    this.causationId = input.causationId;
    this.metadata = input.metadata;

    // A fact is not editable. Freezing the instance is what makes that true for
    // anyone holding it, not merely for anyone using its public surface.
    Object.freeze(this);
  }

  /**
   * Builds a record for a fact that just happened.
   *
   * Every optional reference is normalized and validated here, so a malformed
   * identifier fails at the boundary that stated the fact instead of being
   * stored as an unqueryable value.
   *
   * @throws InvalidPrimitiveError — a blank or malformed tenant, correlation or
   * causation identifier.
   */
  public static create(input: CreateAuditRecordInput): AuditRecord {
    return new AuditRecord({
      id: input.id ?? generateAuditRecordId(),
      ...(input.tenantId === undefined
        ? {}
        : { tenantId: assertOpaqueIdentifier(input.tenantId, 'AuditRecord', 'tenantId') }),
      actor: input.actor,
      action: input.action,
      ...(input.target === undefined ? {} : { target: input.target }),
      outcome: input.outcome,
      occurredAt: input.occurredAt,
      ...(input.correlationId === undefined
        ? {}
        : {
            correlationId: assertOpaqueIdentifier(
              input.correlationId,
              'AuditRecord',
              'correlationId',
            ),
          }),
      ...(input.causationId === undefined
        ? {}
        : {
            causationId: assertOpaqueIdentifier(input.causationId, 'AuditRecord', 'causationId'),
          }),
      // Sanitization happens *before* the record exists, so there is no moment
      // at which an unsanitized context is attached to an audit fact.
      metadata: sanitizeAuditMetadata(input.metadata),
    });
  }

  /**
   * Rebuilds a record from stored state.
   *
   * Values are re-validated through their value objects, so a broken row fails
   * loudly at the boundary rather than entering the domain as an impossible
   * state. Stored metadata is re-sanitized as well: a row written before a rule
   * existed (or by something other than this adapter) still cannot leak
   * credential material through the domain.
   */
  public static rehydrate(snapshot: AuditRecordSnapshot): AuditRecord {
    return new AuditRecord({
      id: auditRecordIdFrom(snapshot.id),
      ...(snapshot.tenantId === undefined
        ? {}
        : { tenantId: assertOpaqueIdentifier(snapshot.tenantId, 'AuditRecord', 'tenantId') }),
      actor: AuditActor.from({ type: snapshot.actorType, userId: snapshot.actorUserId }),
      action: AuditAction.from(snapshot.action),
      ...(snapshot.targetType === undefined || snapshot.targetId === undefined
        ? {}
        : { target: AuditTarget.of(snapshot.targetType, snapshot.targetId) }),
      outcome: AuditOutcome.from(snapshot.outcome),
      occurredAt: snapshot.occurredAt,
      ...(snapshot.correlationId === undefined
        ? {}
        : {
            correlationId: assertOpaqueIdentifier(
              snapshot.correlationId,
              'AuditRecord',
              'correlationId',
            ),
          }),
      ...(snapshot.causationId === undefined
        ? {}
        : {
            causationId: assertOpaqueIdentifier(snapshot.causationId, 'AuditRecord', 'causationId'),
          }),
      metadata: sanitizeAuditMetadata(snapshot.metadata),
    });
  }

  /** Whether the operation this record describes succeeded. */
  public isSuccess(): boolean {
    return this.outcome.isSuccess();
  }

  /** Whether the operation was refused before it ran. */
  public isDenied(): boolean {
    return this.outcome.isDenied();
  }

  /** Whether the record belongs to a tenant (rather than to the platform). */
  public isTenantScoped(): boolean {
    return this.tenantId !== undefined;
  }

  /**
   * The record's current state as plain values.
   *
   * A frozen copy: a caller gets the shape storage and mapping both work with,
   * cannot mutate the values the record was built from, and cannot pretend it
   * changed a fact by editing what it was handed.
   */
  public snapshot(): AuditRecordSnapshot {
    return Object.freeze({
      id: this.id.value,
      ...(this.tenantId === undefined ? {} : { tenantId: this.tenantId }),
      actorType: this.actor.type,
      ...(this.actor.userId === undefined ? {} : { actorUserId: this.actor.userId }),
      action: this.action.value,
      ...(this.target === undefined
        ? {}
        : { targetType: this.target.type, targetId: this.target.id }),
      outcome: this.outcome.value,
      occurredAt: this.occurredAt,
      ...(this.correlationId === undefined ? {} : { correlationId: this.correlationId }),
      ...(this.causationId === undefined ? {} : { causationId: this.causationId }),
      metadata: this.metadata,
    });
  }
}
