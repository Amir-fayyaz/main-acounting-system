import { and, eq } from 'drizzle-orm';

import type { Database } from '../../../../infrastructure/database/database.module.js';
import { scopedDatabase } from '../../../../infrastructure/database/scoped-database.js';
import {
  assertTenantCriterion,
  assertTenantOwnership,
  tenantEq,
} from '../../../../infrastructure/database/tenant-scoped.js';
import type {
  AccountTemplateApplication,
  AccountTemplateApplicationRepository,
} from '../../domain/repositories/account-template.repository.js';
import { accountTemplateApplications } from './account-template.schema.js';

export class DrizzleAccountTemplateApplicationRepository implements AccountTemplateApplicationRepository {
  public constructor(private readonly database: Database) {}

  public async hasApplied(tenantId: string, templateVersion: string): Promise<boolean> {
    assertTenantCriterion(tenantId, 'AccountTemplateApplicationRepository.hasApplied');

    const rows = await scopedDatabase(this.database)
      .select({ templateVersion: accountTemplateApplications.templateVersion })
      .from(accountTemplateApplications)
      .where(
        and(
          eq(accountTemplateApplications.tenantId, tenantId),
          eq(accountTemplateApplications.templateVersion, templateVersion),
          tenantEq(accountTemplateApplications.tenantId),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }

  public async markApplied(application: AccountTemplateApplication): Promise<void> {
    assertTenantOwnership(application.tenantId, 'AccountTemplateApplicationRepository.markApplied');

    await scopedDatabase(this.database).insert(accountTemplateApplications).values({
      tenantId: application.tenantId,
      templateVersion: application.templateVersion,
      appliedAt: application.appliedAt.toDate(),
    });
  }
}
