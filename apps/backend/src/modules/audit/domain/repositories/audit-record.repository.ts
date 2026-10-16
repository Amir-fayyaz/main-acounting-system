import type { AddsAggregate } from '../../../../shared/persistence/repository-ports.js';
import type { AuditRecord } from '../aggregates/audit-record.js';

/**
 * The audit persistence port (AUD-001; SHR-004; ADR-003 sections 4, 14 and 21).
 *
 * The port is the *whole* view this module has of audit storage, and it is one
 * capability wide on purpose:
 *
 * ```text
 * add(record) → the record is durable
 * ```
 *
 * Three refusals define it, and each is the reason an audit trail is worth
 * anything:
 *
 * - **Append only.** There is no `update`, no delete and no upsert — not on
 *   this port and not anywhere in the kernel's vocabulary (SHR-004 ships none
 *   of them). A record that could be rewritten would let the very actor it
 *   incriminates change the story.
 * - **No read here.** Looking at audit data is a different question with a
 *   different audience, so it has its own contract and its own adapter
 *   (`AuditRecordQuery`), which returns plain read models and is
 *   authorization-protected where it is exposed. A single port that both wrote
 *   and read would be a gateway, and the architecture forbids a module-owned
 *   gateway as much as a global one.
 * - **No criteria, no query.** Filtering exists on the read side only; the
 *   write side cannot be used to look anything up.
 *
 * Composing the shared `AddsAggregate` capability (rather than declaring a
 * bespoke `add`) is what keeps the write honest: it answers with the receipt of
 * a record that is now at its initial revision, and an adapter that cannot tell
 * whether the write landed must throw a `PersistenceError` with
 * `outcomeKnown: false` instead of reporting a success it is unsure about
 * (SHR-004; ADR-004 section 31). The audit table therefore carries a revision
 * column like every other module's table, which for an append-only record is
 * always `1` — it exists so the write speaks the shared vocabulary, not because
 * a record ever changes.
 *
 * The port is declared here; the Drizzle/MySQL implementation lives in this
 * module's `infrastructure/persistence/`, and no other module may import either
 * (enforced by `src/modules/module-boundaries.spec.ts`). Consumers record
 * through the published application contract
 * (`application/ports/audit-recorder.port.ts`) and never touch this.
 *
 * Declared as a composition of the one shared capability rather than an
 * interface with new members, so the port cannot grow a second operation by
 * accident: an update, a delete or a read would have to be decided here
 * deliberately, and each of them is a refusal this port exists to state.
 */
export type AuditRecordRepository = AddsAggregate<AuditRecord>;
