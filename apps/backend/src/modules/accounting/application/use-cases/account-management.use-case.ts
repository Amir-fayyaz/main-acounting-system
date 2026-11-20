import { AccountRoleProtectedError } from '../../domain/errors/account-role.errors.js';
import { isCompatibleAccountType } from '../../domain/value-objects/account-role.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { Account } from '../../domain/aggregates/account.js';
import {
  AccountCodeDuplicateError,
  AccountHasActiveChildrenError,
  AccountHasChildrenError,
  AccountInUseError,
  AccountInvalidParentError,
  AccountNotFoundError,
  AccountParentInactiveError,
  AccountSystemProtectedError,
  AccountTypeMismatchError,
  AccountNormalBalanceMismatchError,
} from '../../domain/errors/account.errors.js';
import type { AccountRepository } from '../../domain/repositories/account.repository.js';
import { AccountCode } from '../../domain/value-objects/account-code.js';
import { AccountType } from '../../domain/value-objects/account-type.js';
import { NormalBalance } from '../../domain/value-objects/account-normal-balance.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import { accountIdFrom } from '../../domain/value-objects/account-id.js';
import type {
  AccountAuditPort,
  AccountAuthorizationPort,
  AccountUsagePort,
} from '../ports/account.ports.js';
import type {
  CreateAccount,
  UpdateAccount,
  DeactivateAccount,
  ReactivateAccount,
  DeleteAccount,
} from '../commands/account.commands.js';
import { toAccountView, type AccountView } from '../views/account.view.js';
import type { AccountRoleRepository } from '../../domain/repositories/account-role.repository.js';

export class CreateAccountUseCase {
  public constructor(
    private readonly repository: AccountRepository,
    private readonly authorization: AccountAuthorizationPort,
    private readonly audit: AccountAuditPort,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: CreateAccount): Promise<Result<AccountView, DomainError>> {
    const tenantId = TenantScope.requireTenantId();

    return this.boundary.execute(async () => {
      await this.authorization.assertCanManageAccounts(tenantId);

      const code = AccountCode.from(command.payload.code);
      const existing = await this.repository.findByTenant(tenantReferenceFrom(tenantId));
      if (existing.some((entry) => entry.aggregate.code.value === code.value)) {
        return Result.fail(new AccountCodeDuplicateError(code.value));
      }

      const type = AccountType.from(command.payload.type);
      const normalBalance = NormalBalance.from(
        command.payload.normalBalance ?? type.defaultNormalBalance,
      );
      const now = DateTime.now();

      let account: Account;
      if (command.payload.parentId) {
        const parentLoaded = await this.repository.get(accountIdFrom(command.payload.parentId));
        if (parentLoaded === undefined || parentLoaded.aggregate.tenantId !== tenantId) {
          return Result.fail(new AccountInvalidParentError());
        }

        const parent = parentLoaded.aggregate;
        if (!parent.active) {
          return Result.fail(new AccountParentInactiveError());
        }
        if (parent.type.value !== type.value) {
          return Result.fail(new AccountTypeMismatchError(type.value, parent.type.value));
        }
        if (parent.normalBalance.value !== normalBalance.value) {
          return Result.fail(
            new AccountNormalBalanceMismatchError(normalBalance.value, parent.normalBalance.value),
          );
        }

        account = Account.createAsChild({
          parent,
          code,
          name: command.payload.name,
          type,
          normalBalance,
          postable: command.payload.postable ?? false,
          active: command.payload.active ?? true,
          system: command.payload.system ?? false,
          now,
          tenantId,
        });
      } else {
        account = Account.create({
          tenantId,
          code,
          name: command.payload.name,
          type,
          normalBalance,
          postable: command.payload.postable ?? false,
          active: command.payload.active ?? true,
          system: command.payload.system ?? false,
          now,
        });
      }

      await this.repository.add(account);
      await this.audit.record({
        action: 'account.created',
        accountId: account.id.value,
        tenantId,
      });

      return Result.ok(toAccountView(account, 1));
    });
  }
}

export class UpdateAccountUseCase {
  constructor(
    private readonly repository: AccountRepository,
    private readonly usage: AccountUsagePort,
    private readonly authorization: AccountAuthorizationPort,
    private readonly audit: AccountAuditPort,
    private readonly boundary: TransactionBoundary,
    private readonly roles?: AccountRoleRepository,
  ) {}

  public async execute(command: UpdateAccount): Promise<Result<AccountView, DomainError>> {
    const tenantId = TenantScope.requireTenantId();

    return this.boundary.execute(async () => {
      await this.authorization.assertCanManageAccounts(tenantId);

      const loaded = await this.repository.get(accountIdFrom(command.payload.id));
      if (loaded === undefined || loaded.aggregate.tenantId !== tenantId) {
        return Result.fail(new AccountNotFoundError(command.payload.id));
      }

      const account = loaded.aggregate;
      // Protect accounts currently assigned to accounting roles.
      if (this.roles !== undefined) {
        const mappings = await this.roles.findByAccount(tenantId, account.id.value);

        if (mappings.length > 0) {
          const resultingType = command.payload.type ?? account.type.value;
          const resultingActive = command.payload.active ?? account.active;
          const resultingPostable = command.payload.postable ?? account.postable;

          const violatesRoleMapping = mappings.some(
            (mapping) =>
              !resultingActive ||
              !resultingPostable ||
              !isCompatibleAccountType(mapping.role, resultingType),
          );

          if (violatesRoleMapping) {
            return Result.fail(new AccountRoleProtectedError());
          }
        }
      }
      const now = DateTime.now();

      if (command.payload.code !== undefined && command.payload.code !== account.code.value) {
        if (await this.usage.isUsed(account.id.value)) {
          return Result.fail(new AccountInUseError());
        }
        account.changeCode(AccountCode.from(command.payload.code), now);
      }

      if (command.payload.type !== undefined && command.payload.type !== account.type.value) {
        if (await this.usage.isUsed(account.id.value)) {
          return Result.fail(new AccountInUseError());
        }
        const type = AccountType.from(command.payload.type);
        const normalBalance = NormalBalance.from(
          command.payload.normalBalance ?? account.normalBalance.value,
        );
        account.changeType(type, normalBalance, now);
      }

      if (
        command.payload.normalBalance !== undefined &&
        command.payload.normalBalance !== account.normalBalance.value
      ) {
        if (await this.usage.isUsed(account.id.value)) {
          return Result.fail(new AccountInUseError());
        }
        account.changeType(account.type, NormalBalance.from(command.payload.normalBalance), now);
      }

      if (command.payload.parentId !== undefined && command.payload.parentId !== account.parentId) {
        if (await this.usage.isUsed(account.id.value)) {
          return Result.fail(new AccountInUseError());
        }

        if (command.payload.parentId === null) {
          account.changeParent(null, 1, now);
        } else {
          const parentLoaded = await this.repository.get(accountIdFrom(command.payload.parentId));
          if (parentLoaded === undefined || parentLoaded.aggregate.tenantId !== tenantId) {
            return Result.fail(new AccountInvalidParentError());
          }
          const parent = parentLoaded.aggregate;
          if (!parent.active) {
            return Result.fail(new AccountParentInactiveError());
          }
          if (parent.type.value !== account.type.value) {
            return Result.fail(new AccountTypeMismatchError(account.type.value, parent.type.value));
          }
          if (parent.normalBalance.value !== account.normalBalance.value) {
            return Result.fail(
              new AccountNormalBalanceMismatchError(
                account.normalBalance.value,
                parent.normalBalance.value,
              ),
            );
          }
          account.changeParent(parent.id.value, parent.level + 1, now);
        }
      }

      if (command.payload.name !== undefined) {
        account.rename(command.payload.name, now);
      }

      if (command.payload.postable !== undefined) {
        account.setPostable(command.payload.postable, now);
      }

      if (command.payload.active !== undefined) {
        if (command.payload.active === false) {
          const hasActiveChildren = (
            await this.repository.findByTenant(tenantReferenceFrom(tenantId))
          ).some(
            (entry) => entry.aggregate.parentId === account.id.value && entry.aggregate.active,
          );
          if (hasActiveChildren) {
            return Result.fail(new AccountHasActiveChildrenError());
          }
        }

        if (command.payload.active === true && account.parentId !== null) {
          const parentLoaded = await this.repository.get(accountIdFrom(account.parentId));
          if (parentLoaded === undefined || !parentLoaded.aggregate.active) {
            return Result.fail(new AccountParentInactiveError());
          }
        }

        account.setActive(command.payload.active, now);
      }

      await this.repository.update(account, loaded.revision);
      await this.audit.record({
        action: 'account.updated',
        accountId: account.id.value,
        tenantId,
      });

      return Result.ok(toAccountView(account, loaded.revision.next().value));
    });
  }
}

export class DeactivateAccountUseCase {
  constructor(
    private readonly repository: AccountRepository,
    private readonly usage: AccountUsagePort,
    private readonly authorization: AccountAuthorizationPort,
    private readonly audit: AccountAuditPort,
    private readonly boundary: TransactionBoundary,
    private readonly roles?: AccountRoleRepository,
  ) {}

  public async execute(command: DeactivateAccount): Promise<Result<AccountView, DomainError>> {
    const tenantId = TenantScope.requireTenantId();

    return this.boundary.execute(async () => {
      await this.authorization.assertCanManageAccounts(tenantId);

      const loaded = await this.repository.get(accountIdFrom(command.payload.id));

      if (loaded === undefined || loaded.aggregate.tenantId !== tenantId) {
        return Result.fail(new AccountNotFoundError(command.payload.id));
      }

      const account = loaded.aggregate;

      // A mapped account cannot be deactivated before its role is remapped.
      if (this.roles !== undefined) {
        const mappings = await this.roles.findByAccount(tenantId, account.id.value);

        if (mappings.length > 0) {
          return Result.fail(new AccountRoleProtectedError());
        }
      }

      if (await this.usage.isUsed(account.id.value)) {
        return Result.fail(new AccountInUseError());
      }

      const children = (await this.repository.findByTenant(tenantReferenceFrom(tenantId))).filter(
        (entry) => entry.aggregate.parentId === account.id.value && entry.aggregate.active,
      );

      if (children.length > 0) {
        return Result.fail(new AccountHasActiveChildrenError());
      }

      account.setActive(false, DateTime.now());

      await this.repository.update(account, loaded.revision);

      await this.audit.record({
        action: 'account.deactivated',
        accountId: account.id.value,
        tenantId,
      });

      return Result.ok(toAccountView(account, loaded.revision.next().value));
    });
  }
}

export class ReactivateAccountUseCase {
  public constructor(
    private readonly repository: AccountRepository,
    private readonly usage: AccountUsagePort,
    private readonly authorization: AccountAuthorizationPort,
    private readonly audit: AccountAuditPort,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: ReactivateAccount): Promise<Result<AccountView, DomainError>> {
    const tenantId = TenantScope.requireTenantId();

    return this.boundary.execute(async () => {
      await this.authorization.assertCanManageAccounts(tenantId);

      const loaded = await this.repository.get(accountIdFrom(command.payload.id));
      if (loaded === undefined || loaded.aggregate.tenantId !== tenantId) {
        return Result.fail(new AccountNotFoundError(command.payload.id));
      }

      const account = loaded.aggregate;
      if (await this.usage.isUsed(account.id.value)) {
        return Result.fail(new AccountInUseError());
      }

      if (account.parentId !== null) {
        const parentLoaded = await this.repository.get(accountIdFrom(account.parentId));
        if (parentLoaded === undefined || !parentLoaded.aggregate.active) {
          return Result.fail(new AccountParentInactiveError());
        }
      }

      account.setActive(true, DateTime.now());
      await this.repository.update(account, loaded.revision);
      await this.audit.record({
        action: 'account.reactivated',
        accountId: account.id.value,
        tenantId,
      });
      return Result.ok(toAccountView(account, loaded.revision.next().value));
    });
  }
}

export class DeleteAccountUseCase {
  public constructor(
    private readonly repository: AccountRepository,
    private readonly usage: AccountUsagePort,
    private readonly authorization: AccountAuthorizationPort,
    private readonly audit: AccountAuditPort,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: DeleteAccount): Promise<Result<void, DomainError>> {
    const tenantId = TenantScope.requireTenantId();

    return this.boundary.execute(async () => {
      await this.authorization.assertCanManageAccounts(tenantId);

      const loaded = await this.repository.get(accountIdFrom(command.payload.id));
      if (loaded === undefined || loaded.aggregate.tenantId !== tenantId) {
        return Result.fail(new AccountNotFoundError(command.payload.id));
      }

      const account = loaded.aggregate;
      if (account.system) {
        return Result.fail(new AccountSystemProtectedError());
      }
      if (await this.usage.isUsed(account.id.value)) {
        return Result.fail(new AccountInUseError());
      }

      const hasChildren = (await this.repository.findByTenant(tenantReferenceFrom(tenantId))).some(
        (entry) => entry.aggregate.parentId === account.id.value,
      );
      if (hasChildren) {
        return Result.fail(new AccountHasChildrenError());
      }

      await this.repository.delete(account);
      await this.audit.record({ action: 'account.deleted', accountId: account.id.value, tenantId });
      return Result.ok(undefined);
    });
  }
}
