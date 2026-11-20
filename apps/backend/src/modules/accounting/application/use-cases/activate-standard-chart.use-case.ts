import { Result } from '../../../../shared/errors/result.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';

import { Account } from '../../domain/aggregates/account.js';
import { AccountCodeDuplicateError } from '../../domain/errors/account.errors.js';
import {
  AccountTemplateAlreadyAppliedError,
  AccountTemplateInvalidError,
} from '../../domain/errors/account-template.errors.js';
import type { AccountRepository } from '../../domain/repositories/account.repository.js';
import type { AccountTemplateApplicationRepository } from '../../domain/repositories/account-template.repository.js';
import {
  STANDARD_CHART_TEMPLATE,
  validateStandardChartTemplate,
  type StandardChartTemplate,
} from '../../domain/templates/standard-chart.template.js';
import { AccountCode } from '../../domain/value-objects/account-code.js';
import { AccountType } from '../../domain/value-objects/account-type.js';
import { NormalBalance } from '../../domain/value-objects/account-normal-balance.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import type { ActivateStandardChart } from '../commands/activate-standard-chart.command.js';
import type { AccountAuditPort, AccountAuthorizationPort } from '../ports/account.ports.js';
import { toAccountView, type AccountView } from '../views/account.view.js';

export interface StandardChartActivationView {
  readonly templateVersion: string;
  readonly createdCount: number;
  readonly accounts: readonly AccountView[];
}

const TEMPLATES = new Map<string, StandardChartTemplate>([
  [STANDARD_CHART_TEMPLATE.version, STANDARD_CHART_TEMPLATE],
]);

export class ActivateStandardChartUseCase {
  public constructor(
    private readonly accounts: AccountRepository,
    private readonly applications: AccountTemplateApplicationRepository,
    private readonly authorization: AccountAuthorizationPort,
    private readonly audit: AccountAuditPort,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(
    command: ActivateStandardChart,
  ): Promise<Result<StandardChartActivationView, DomainError>> {
    const tenantId = TenantScope.requireTenantId();

    return this.boundary.execute(async () => {
      await this.authorization.assertCanManageAccounts(tenantId);

      const template = TEMPLATES.get(command.payload.templateVersion);
      if (template === undefined) {
        return Result.fail(
          new AccountTemplateInvalidError(
            command.payload.templateVersion,
            'Unknown template version.',
          ),
        );
      }

      const violations = validateStandardChartTemplate(template);
      if (violations.length > 0) {
        return Result.fail(
          new AccountTemplateInvalidError(template.version, violations[0]!.message),
        );
      }

      if (await this.applications.hasApplied(tenantId, template.version)) {
        return Result.fail(new AccountTemplateAlreadyAppliedError(template.version));
      }

      const existing = await this.accounts.findByTenant(tenantReferenceFrom(tenantId));
      const existingCodes = new Set(existing.map((entry) => entry.aggregate.code.value));
      const conflicting = template.accounts.find((entry) => existingCodes.has(entry.code));
      if (conflicting !== undefined) {
        return Result.fail(new AccountCodeDuplicateError(conflicting.code));
      }

      const now = DateTime.now();
      const created = new Map<string, Account>();
      const views: AccountView[] = [];

      for (const entry of template.accounts) {
        const type = AccountType.from(entry.type.value);
        const normalBalance = NormalBalance.from(entry.normalBalance.value);
        const code = AccountCode.from(entry.code);

        let account: Account;
        if (entry.parentCode === null) {
          account = Account.create({
            tenantId,
            code,
            name: entry.name,
            type,
            normalBalance,
            postable: entry.postable,
            active: true,
            system: true,
            now,
          });
        } else {
          const parent = created.get(entry.parentCode);
          if (parent === undefined) {
            return Result.fail(
              new AccountTemplateInvalidError(
                template.version,
                `Parent ${entry.parentCode} is missing.`,
              ),
            );
          }

          account = Account.createAsChild({
            parent,
            tenantId,
            code,
            name: entry.name,
            type,
            normalBalance,
            postable: entry.postable,
            active: true,
            system: true,
            now,
          });
        }

        await this.accounts.add(account);
        created.set(entry.code, account);
        views.push(toAccountView(account, 1));
      }

      await this.applications.markApplied({
        tenantId,
        templateVersion: template.version,
        appliedAt: now,
      });

      const root = template.accounts.find((entry) => entry.parentCode === null);
      await this.audit.record({
        action: 'account.template.activated',
        accountId: root === undefined ? '' : (created.get(root.code)?.id.value ?? ''),
        tenantId,
        details: {
          templateVersion: template.version,
          accountCount: views.length,
        },
      });

      return Result.ok({
        templateVersion: template.version,
        createdCount: views.length,
        accounts: views,
      });
    });
  }
}
