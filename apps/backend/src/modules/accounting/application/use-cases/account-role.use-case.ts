import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';

import type { AccountRepository } from '../../domain/repositories/account.repository.js';
import type {
  AccountRoleMapping,
  AccountRoleRepository,
} from '../../domain/repositories/account-role.repository.js';

import type { AccountRole } from '../../domain/value-objects/account-role.js';
import { isAccountRole, isCompatibleAccountType } from '../../domain/value-objects/account-role.js';

import {
  AccountRoleInvalidTargetError,
  AccountRoleUnmappedError,
} from '../../domain/errors/account-role.errors.js';

import { accountIdFrom } from '../../domain/value-objects/account-id.js';

import type { AccountAuditPort, AccountAuthorizationPort } from '../ports/account.ports.js';

export interface MapAccountRoleInput {
  readonly role: AccountRole;
  readonly accountId: string;
}

export interface ResolveAccountRoleInput {
  readonly role: AccountRole;
}

export interface AccountRoleCompleteness {
  readonly required: readonly AccountRole[];
  readonly mapped: readonly AccountRole[];
  readonly missing: readonly AccountRole[];
  readonly complete: boolean;
}

const REQUIRED_ROLES: readonly AccountRole[] = [
  'inventory',
  'payable',
  'input_vat',
  'purchase_discount',
];

export class MapAccountRoleUseCase {
  public constructor(
    private readonly accounts: AccountRepository,
    private readonly roles: AccountRoleRepository,
    private readonly authorization: AccountAuthorizationPort,
    private readonly audit: AccountAuditPort,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(input: MapAccountRoleInput): Promise<Result<void, DomainError>> {
    const tenantId = TenantScope.requireTenantId();

    return this.boundary.execute(async () => {
      await this.authorization.assertCanManageAccounts(tenantId);

      if (!isAccountRole(input.role)) {
        return Result.fail(
          new AccountRoleInvalidTargetError(String(input.role), 'Unknown accounting role.'),
        );
      }

      const loaded = await this.accounts.get(accountIdFrom(input.accountId));

      if (loaded === undefined || loaded.aggregate.tenantId !== tenantId) {
        return Result.fail(
          new AccountRoleInvalidTargetError(input.role, 'Account does not exist in this tenant.'),
        );
      }

      const account = loaded.aggregate;

      if (!account.active) {
        return Result.fail(new AccountRoleInvalidTargetError(input.role, 'Account is inactive.'));
      }

      if (!account.postable) {
        return Result.fail(
          new AccountRoleInvalidTargetError(input.role, 'Account is not postable.'),
        );
      }

      if (!isCompatibleAccountType(input.role, account.type.value)) {
        return Result.fail(
          new AccountRoleInvalidTargetError(
            input.role,
            `Account type "${account.type.value}" is not compatible with this role.`,
          ),
        );
      }

      const previous = await this.roles.findByRole(tenantId, input.role);

      const now = new Date();

      const mapping: AccountRoleMapping = {
        tenantId,
        role: input.role,
        accountId: account.id.value,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };

      await this.roles.save(mapping);

      await this.audit.record({
        action: previous ? 'account.role.remapped' : 'account.role.mapped',
        accountId: account.id.value,
        tenantId,
        details: {
          role: input.role,
          previousAccountId: previous?.accountId ?? null,
        },
      });

      return Result.ok(undefined);
    });
  }
}

export class ResolveAccountRoleUseCase {
  public constructor(
    private readonly roles: AccountRoleRepository,
    private readonly accounts: AccountRepository,
  ) {}

  public async execute(input: ResolveAccountRoleInput): Promise<Result<string, DomainError>> {
    const tenantId = TenantScope.requireTenantId();

    if (!isAccountRole(input.role)) {
      return Result.fail(
        new AccountRoleInvalidTargetError(String(input.role), 'Unknown accounting role.'),
      );
    }

    const mapping = await this.roles.findByRole(tenantId, input.role);

    if (mapping === undefined) {
      return Result.fail(new AccountRoleUnmappedError(input.role));
    }

    const loaded = await this.accounts.get(accountIdFrom(mapping.accountId));

    if (
      loaded === undefined ||
      loaded.aggregate.tenantId !== tenantId ||
      !loaded.aggregate.active ||
      !loaded.aggregate.postable ||
      !isCompatibleAccountType(input.role, loaded.aggregate.type.value)
    ) {
      return Result.fail(
        new AccountRoleInvalidTargetError(
          input.role,
          'The mapped account is no longer a valid target.',
        ),
      );
    }

    return Result.ok(mapping.accountId);
  }
}

export class GetRoleCompletenessUseCase {
  public constructor(
    private readonly roles: AccountRoleRepository,
    private readonly accounts: AccountRepository,
  ) {}

  public async execute(): Promise<AccountRoleCompleteness> {
    const tenantId = TenantScope.requireTenantId();

    const mappings = await this.roles.findAll(tenantId);

    const validMappedRoles: AccountRole[] = [];

    for (const role of REQUIRED_ROLES) {
      const mapping = mappings.find((item) => item.role === role);

      if (mapping === undefined) {
        continue;
      }

      const loaded = await this.accounts.get(accountIdFrom(mapping.accountId));

      if (
        loaded === undefined ||
        loaded.aggregate.tenantId !== tenantId ||
        !loaded.aggregate.active ||
        !loaded.aggregate.postable ||
        !isCompatibleAccountType(role, loaded.aggregate.type.value)
      ) {
        continue;
      }

      validMappedRoles.push(role);
    }

    const missing = REQUIRED_ROLES.filter((role) => !validMappedRoles.includes(role));

    return {
      required: REQUIRED_ROLES,
      mapped: validMappedRoles,
      missing,
      complete: missing.length === 0,
    };
  }
}
