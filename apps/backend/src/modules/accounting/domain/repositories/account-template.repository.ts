import type { DateTime } from '../../../../shared/time/date-time.js';

export interface AccountTemplateApplication {
  readonly tenantId: string;
  readonly templateVersion: string;
  readonly appliedAt: DateTime;
}

export interface AccountTemplateApplicationRepository {
  hasApplied(tenantId: string, templateVersion: string): Promise<boolean>;

  markApplied(application: AccountTemplateApplication): Promise<void>;
}
