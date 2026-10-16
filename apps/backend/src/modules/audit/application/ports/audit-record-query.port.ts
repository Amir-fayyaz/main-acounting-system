import type { ReadPort } from '../../../../shared/persistence/read-port.js';
import type { DateTime } from '../../../../shared/time/date-time.js';
import type { AuditOutcomeValue } from '../../domain/value-objects/audit-outcome.js';
import type { AuditRecordView } from '../views/audit-record.view.js';

/**
 * The controlled read side of the audit trail (AUD-001; SHR-004; ADR-009).
 *
 * Reading audit data is a different question from writing it, with a different
 * audience — an internal operator, an incident review, a compliance answer — so
 * it gets its own port rather than a second method on the repository. It is a
 * {@link ReadPort}: one `read` operation, plain read models out, no write, no
 * delete and no transaction (a query never changes anything).
 *
 * Three properties are load-bearing:
 *
 * - **The criteria are closed and tenant-scoped.** `tenantId` is required and
 *   is filled by the application from the resolved tenant scope, never from a
 *   client field (ADR-003, section 24: every business read has a valid company
 *   scope, and no path bypasses it). A caller physically cannot ask for "all
 *   tenants".
 * - **The filters are the trail's own vocabulary.** Tenant, actor, action,
 *   target, outcome and a half-open time window — the questions the acceptance
 *   criteria require — and nothing that would turn the port into a query
 *   language.
 * - **It is paginated in the store.** The adapter applies `page`/`limit` in SQL
 *   and answers the total, so a large trail is never loaded to be sliced and the
 *   standard pagination envelope can be built from real counts.
 *
 * Authorization is *not* part of this contract: the port answers what it is
 * asked. Deciding who may ask is the job of whoever exposes it (the retrieval
 * use case and, above it, the HTTP authorization boundary), which is what keeps
 * a policy change from requiring a change here.
 *
 * Declared as a composition of the shared capability, the way the read-port
 * convention does, so this port cannot grow a second operation by accident: a
 * read the trail does not need has to be decided here deliberately.
 */
export type AuditRecordQuery = ReadPort<AuditRecordCriteria, AuditRecordPage>;

/** What a reader may filter on. Every field except the scope and the page is optional. */
export interface AuditRecordCriteria {
  /** The tenant whose trail is being read. Filled from the resolved scope, never from a client. */
  readonly tenantId: string;
  /** Only facts performed by this user. */
  readonly actorUserId?: string;
  /** Only facts with this action name. */
  readonly action?: string;
  /** Only facts about this kind of resource. */
  readonly targetType?: string;
  /** Only facts about this resource. */
  readonly targetId?: string;
  /** Only facts with this outcome. */
  readonly outcome?: AuditOutcomeValue;
  /** Inclusive lower bound of the time window. */
  readonly from?: DateTime;
  /** Inclusive upper bound of the time window. */
  readonly to?: DateTime;
  /** 1-based page number, as the standard pagination query defines it. */
  readonly page: number;
  /** Page size, as the standard pagination query bounds it. */
  readonly limit: number;
}

/** One page of the trail, with the total the pagination envelope needs. */
export interface AuditRecordPage {
  /** The records on this page, newest first. */
  readonly records: readonly AuditRecordView[];
  /** How many records match the criteria in total, across every page. */
  readonly total: number;
}
