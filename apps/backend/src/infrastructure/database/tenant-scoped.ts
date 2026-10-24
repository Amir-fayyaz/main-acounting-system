import { eq, type SQL } from 'drizzle-orm';
import type { AnyMySqlColumn } from 'drizzle-orm/mysql-core';

import { TenantScope } from '../../shared/tenant/tenant-scope.js';
import { isSameTenant } from '../../shared/tenant/tenant-identity.js';
import {
  TenantContextMissingError,
  TenantIsolationViolationError,
} from '../../shared/tenant/tenant.errors.js';

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

/**
 * Asserts that an aggregate about to be written belongs to the active tenant
 * (IAM-007, sections 4–5).
 *
 * Every tenant-owned write runs through this check immediately before the
 * statement, so a caller cannot store a row for another company by supplying a
 * foreign aggregate or a foreign `tenantId` field. The comparison is against
 * the ambient scope, never against an id the caller passes, and a missing or
 * system scope is refused (fail closed) rather than treated as "no filter".
 *
 * @throws TenantContextMissingError — no available tenant scope.
 * @throws TenantIsolationViolationError — the aggregate belongs to another
 * tenant.
 */
export function assertTenantOwnership(aggregateTenantId: string, operation: string): string {
  const activeTenantId = TenantScope.requireTenantId();

  if (!isSameTenant(activeTenantId, aggregateTenantId)) {
    throw new TenantIsolationViolationError(operation);
  }

  return activeTenantId;
}

/**
 * Asserts that an explicit tenant criterion is the active tenant (IAM-007,
 * section 4).
 *
 * Reads that name a tenant (a list of a tenant's roles, the memberships of a
 * user/tenant pair) compare that criterion with the ambient scope before the
 * statement runs. Under an available scope a mismatch is refused; under an
 * explicit system scope the operation is a declared system read and is allowed;
 * with no scope at all it is refused, so "nobody established a tenant" can
 * never mean "read every tenant".
 *
 * The returned id is the criterion, already proven to be the one the query may
 * use — adapters should still put the tenant into their `WHERE` clause instead
 * of assuming it.
 */
export function assertTenantCriterion(tenantId: string, operation: string): string {
  const context = TenantScope.current();

  if (context.state === 'available') {
    if (!isSameTenant(context.tenantId, tenantId)) {
      throw new TenantIsolationViolationError(operation);
    }

    return tenantId;
  }

  if (context.state === 'system') {
    // An explicit system operation may read across tenants; that is its declared
    // classification, not an implicit widening of a tenant request.
    return tenantId;
  }

  throw new TenantContextMissingError('missing');
}

/**
 * Asserts that the caller is an explicit system operation (IAM-007, section 9).
 *
 * Cross-tenant reads that are part of a platform question ("which companies
 * does this person belong to?") are not tenant-scoped, and must say so: they
 * may only run under `TenantScope.runAsSystem`. Running them with no scope at
 * all is refused so a forgotten scope cannot silently become a global read.
 *
 * @throws TenantIsolationViolationError — the execution is tenant-scoped (or
 * still unscoped) rather than declared system-level.
 */
export function requireSystemScope(operation: string): void {
  if (TenantScope.current().state !== 'system') {
    throw new TenantIsolationViolationError(operation);
  }
}

/**
 * Asserts that a platform-level write is not running under a tenant scope
 * (IAM-007, sections 5 and 9).
 *
 * A record that belongs to no company (a sign-in fact, a refusal before a
 * tenant was resolved) must not be written by tenant-scoped work: that would
 * let an ordinary tenant operation create unowned rows. Explicit system work and
 * work that has not established a tenant yet are allowed, because the record
 * genuinely belongs to no tenant.
 */
export function assertPlatformWrite(operation: string): void {
  if (TenantScope.current().state === 'available') {
    throw new TenantIsolationViolationError(operation);
  }
}
