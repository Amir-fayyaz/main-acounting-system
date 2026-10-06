import type {
  AddsAggregate,
  Loaded,
  LoadsById,
  UpdatesAggregate,
} from '../../../../shared/persistence/repository-ports.js';
import type { Role } from '../aggregates/role.js';
import type { RoleId } from '../value-objects/role-id.js';
import type { TenantReference } from '../value-objects/tenant-reference.js';

/**
 * The Identity module's repository for Roles (IAM-004; SHR-004).
 *
 * It is assembled from the shared persistence capabilities (`LoadsById`,
 * `AddsAggregate`, `UpdatesAggregate`) plus the one closed criterion this issue
 * needs: every role of a tenant. A role's permission set travels with the
 * aggregate — the adapter writes it beside the role row in the same transaction —
 * so the port exposes no separate permission operation and cannot grow one.
 *
 * There is no delete and no upsert: a role is deactivated, never removed, and a
 * write names the revision it expects, so a stale permission change is refused
 * rather than silently overwriting a concurrent edit (SHR-008).
 *
 * The interface lives in `domain/`; the implementation lives in
 * `infrastructure/persistence/` and is never exposed outside this module
 * (ADR-002 section 8; enforced by `src/modules/module-boundaries.spec.ts`).
 */
export interface RoleRepository
  extends LoadsById<RoleId, Role>, AddsAggregate<Role>, UpdatesAggregate<Role> {
  /** Every role of one tenant, whatever its state. */
  findByTenantId(tenantId: TenantReference): Promise<readonly Loaded<Role>[]>;
}
