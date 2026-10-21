import { eq, type SQL } from 'drizzle-orm';
import type { AnyMySqlColumn } from 'drizzle-orm/mysql-core';

import { TenantScope } from '../../shared/tenant/tenant-scope.js';

/**
 * Central tenant row filter for tenant-owned persistence (TNT-002; SHR-007).
 *
 * Repository adapters that own rows with a `tenant_id` column must constrain
 * every query through this helper (or an equivalent that calls
 * `TenantScope.require()`). Callers never pass a tenant id from the outside —
 * the ambient scope is the single source of truth, so a use case without an
 * established tenant fails closed rather than reading across companies.
 *
 * Usage with Drizzle:
 *
 * ```ts
 * const tenantId = requireTenantId();
 * await db.select().from(memberships).where(and(
 *   tenantEq(memberships.tenantId),
 *   eq(memberships.id, id),
 * ));
 * ```
 *
 * The tenants root table is special: it has no `tenant_id` column and is not
 * filtered by this helper.
 */

/**
 * The tenant id of the current available scope.
 *
 * @throws TenantContextMissingError when the scope is missing or system.
 */
export function requireTenantId(): string {
  return TenantScope.requireTenantId();
}

/**
 * Builds a Drizzle equality predicate `column = currentTenantId`.
 *
 * Fail closed: throws when no available tenant scope is established.
 */
export function tenantEq(column: AnyMySqlColumn): SQL {
  return eq(column, TenantScope.requireTenantId());
}
