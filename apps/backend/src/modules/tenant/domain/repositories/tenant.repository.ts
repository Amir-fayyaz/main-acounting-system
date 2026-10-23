import type {
  AddsAggregate,
  LoadsById,
  UpdatesAggregate,
} from '../../../../shared/persistence/repository-ports.js';
import type { Tenant } from '../aggregates/tenant.js';
import type { TenantId } from '../value-objects/tenant-id.js';

/**
 * The tenant persistence port (IAM-001; SHR-004; ADR-002 section 8; ADR-003
 * sections 4, 14 and 25).
 *
 * The port is the *whole* view this module's Domain and use cases have of
 * tenant storage: load one by identity, insert one, update one against the
 * revision it was read at. It is composed from the shared capabilities rather
 * than written by hand, so it cannot grow a generic query, a delete or an
 * upsert by accident — and so a lost race is reported through the shared
 * optimistic-concurrency mechanism rather than a module-local convention
 * (SHR-008).
 *
 * Two properties carry over from the capabilities:
 *
 * - **Absence is `undefined`, not an error.** Whether a missing tenant is a
 *   404 for a caller is a business decision the use case makes, not one storage
 *   invents.
 * - **Change requires the expected revision.** `update` takes the revision the
 *   caller read; the adapter refuses the write if it moved, so a concurrent
 *   change surfaces as a conflict instead of an overwrite.
 *
 * The interface lives here; the Drizzle/MySQL implementation lives in this
 * module's `infrastructure/persistence/` and no other module may import either
 * (enforced by `src/modules/module-boundaries.spec.ts`).
 */
export interface TenantRepository
  extends LoadsById<TenantId, Tenant>, AddsAggregate<Tenant>, UpdatesAggregate<Tenant> {
  /**
   * Whether a tenant with this identity exists.
   *
   * Existence is the one question about a tenant that is *not* tenant-scoped:
   * it answers "does this company exist?" without saying anything about the
   * company itself. It exists as a separate method — rather than as a
   * `get` that answers `undefined` — so the scope-free question has its own
   * name and a caller cannot reach for a full tenant record by accident
   * (IAM-007).
   */
  exists(tenantId: TenantId): Promise<boolean>;
}
