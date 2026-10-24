import { describe, expect, it } from 'vitest';
import { type SQL } from 'drizzle-orm';
import { MySqlDialect } from 'drizzle-orm/mysql-core';

import type { Database } from '../../../../infrastructure/database/database.module.js';
import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { membershipIdFrom } from '../../domain/value-objects/membership-id.js';
import { DrizzleMembershipRepository } from './drizzle-membership.repository.js';

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const MEMBERSHIP_ID = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f72';

/**
 * Mutation tripwire for the central SQL tenant filter (TNT-002 / IAM-007).
 *
 * Exercise the real Drizzle repository method with a tiny query-builder spy,
 * then compile the captured WHERE clause through MySQL's dialect. This fails
 * both when `tenantEq()` stops emitting a bound predicate and when a repository
 * removes the predicate from its query. Temporarily mutate either line and this
 * test must turn red.
 */
describe('central tenant SQL filter contract', () => {
  it('puts the active tenant predicate in the membership lookup SQL', async () => {
    const predicates: SQL[] = [];
    const database = {
      select: () => ({
        from: () => ({
          where: (predicate: SQL) => {
            predicates.push(predicate);
            return { limit: async () => [] };
          },
        }),
      }),
    } as unknown as Database;

    const repository = new DrizzleMembershipRepository(database);
    await TenantScope.run(createTenantContext(TENANT_A), async () => {
      await repository.get(membershipIdFrom(MEMBERSHIP_ID));
    });

    expect(predicates).toHaveLength(1);
    const query = new MySqlDialect().sqlToQuery(predicates[0]!);
    expect(query.sql.toLowerCase()).toContain('tenant_id');
    expect(query.sql).toContain('=');
    expect(query.params).toContain(TENANT_A);
    expect(query.params).toContain(MEMBERSHIP_ID);
  });
});
