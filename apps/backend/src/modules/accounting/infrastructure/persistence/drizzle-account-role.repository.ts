import { and, eq } from 'drizzle-orm';

import type { Database } from '../../../../infrastructure/database/database.module.js';
import { scopedDatabase } from '../../../../infrastructure/database/scoped-database.js';
import {
  assertTenantCriterion,
  assertTenantOwnership,
  tenantEq,
} from '../../../../infrastructure/database/tenant-scoped.js';

import type {
  AccountRoleMapping,
  AccountRoleRepository,
} from '../../domain/repositories/account-role.repository.js';
import type { AccountRole } from '../../domain/value-objects/account-role.js';
import { accountRoleMappings } from './account-role.schema.js';

export class DrizzleAccountRoleRepository implements AccountRoleRepository {
  public constructor(private readonly database: Database) {}

  public async findByRole(
    tenantId: string,
    role: AccountRole,
  ): Promise<AccountRoleMapping | undefined> {
    assertTenantCriterion(tenantId, 'AccountRoleRepository.findByRole');

    const rows = await scopedDatabase(this.database)
      .select()
      .from(accountRoleMappings)
      .where(
        and(
          eq(accountRoleMappings.tenantId, tenantId),
          eq(accountRoleMappings.role, role),
          tenantEq(accountRoleMappings.tenantId),
        ),
      )
      .limit(1);

    const row = rows[0];
    return row === undefined ? undefined : toMapping(row);
  }

  public async findByAccount(
    tenantId: string,
    accountId: string,
  ): Promise<readonly AccountRoleMapping[]> {
    assertTenantCriterion(tenantId, 'AccountRoleRepository.findByAccount');

    const rows = await scopedDatabase(this.database)
      .select()
      .from(accountRoleMappings)
      .where(
        and(
          eq(accountRoleMappings.tenantId, tenantId),
          eq(accountRoleMappings.accountId, accountId),
          tenantEq(accountRoleMappings.tenantId),
        ),
      );

    return rows.map(toMapping);
  }

  public async findAll(tenantId: string): Promise<readonly AccountRoleMapping[]> {
    assertTenantCriterion(tenantId, 'AccountRoleRepository.findAll');

    const rows = await scopedDatabase(this.database)
      .select()
      .from(accountRoleMappings)
      .where(
        and(eq(accountRoleMappings.tenantId, tenantId), tenantEq(accountRoleMappings.tenantId)),
      );

    return rows.map(toMapping);
  }

  public async save(mapping: AccountRoleMapping): Promise<void> {
    assertTenantOwnership(mapping.tenantId, 'AccountRoleRepository.save');

    await scopedDatabase(this.database)
      .insert(accountRoleMappings)
      .values({
        tenantId: mapping.tenantId,
        role: mapping.role,
        accountId: mapping.accountId,
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt,
      })
      .onDuplicateKeyUpdate({
        set: {
          accountId: mapping.accountId,
          updatedAt: mapping.updatedAt,
        },
      });
  }

  public async remove(tenantId: string, role: AccountRole): Promise<void> {
    assertTenantCriterion(tenantId, 'AccountRoleRepository.remove');

    await scopedDatabase(this.database)
      .delete(accountRoleMappings)
      .where(
        and(
          eq(accountRoleMappings.tenantId, tenantId),
          eq(accountRoleMappings.role, role),
          tenantEq(accountRoleMappings.tenantId),
        ),
      );
  }
}

function toMapping(row: typeof accountRoleMappings.$inferSelect): AccountRoleMapping {
  return {
    tenantId: row.tenantId,
    role: row.role,
    accountId: row.accountId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
