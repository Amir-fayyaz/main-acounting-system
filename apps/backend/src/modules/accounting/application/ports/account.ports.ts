/**
 * Account-management ports used by the use cases in this module.
 *
 * These are intentionally narrow: the use case depends on exactly the signals
 * it needs to enforce usage checks, authorization and auditability without
 * reaching into storage or the HTTP layer.
 */
export interface AccountUsagePort {
  readonly isUsed: (accountId: string) => Promise<boolean>;
}

export interface AccountAuditPort {
  readonly record: (entry: {
    readonly action: string;
    readonly accountId: string;
    readonly tenantId: string;
    readonly details?: Record<string, unknown>;
  }) => Promise<void>;
}

export interface AccountAuthorizationPort {
  readonly assertCanManageAccounts: (tenantId: string) => Promise<void>;
}

export class AlwaysUnusedAccountUsagePort implements AccountUsagePort {
  public async isUsed(): Promise<boolean> {
    return false;
  }
}

export class NoopAccountAuditPort implements AccountAuditPort {
  public async record(): Promise<void> {
    // Intentionally no-op until the auditing module is connected.
  }
}

export class AllowAllAccountantAuthorizationPort implements AccountAuthorizationPort {
  public async assertCanManageAccounts(_tenantId: string): Promise<void> {
    // Temporary adapter: the actual authorization boundary is deferred to B-03.
  }
}
