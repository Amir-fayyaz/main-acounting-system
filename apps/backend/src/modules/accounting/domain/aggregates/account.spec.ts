import { describe, expect, it } from 'vitest';

import { AccountCode } from '../value-objects/account-code.js';
import { AccountType } from '../value-objects/account-type.js';
import { NormalBalance } from '../value-objects/account-normal-balance.js';
import { Account } from './account.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import {
  AccountInvalidParentError,
  AccountTypeMismatchError,
  AccountNormalBalanceMismatchError,
  AccountPostableWithChildrenError,
  AccountPostableNotLeafError,
  AccountSystemProtectedError,
} from '../errors/account.errors.js';

const ROOT_TENANT_ID = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';

function now(): DateTime {
  return DateTime.parse('2026-10-31T12:00:00.000Z');
}

import { DateTime } from '../../../../shared/time/date-time.js';

function makeRootAccount(input?: {
  readonly id?: string;
  readonly tenantId?: string;
  readonly code?: string;
  readonly name?: string;
  readonly type?: string;
  readonly normalBalance?: string;
  readonly postable?: boolean;
  readonly active?: boolean;
  readonly system?: boolean;
}): Account {
  return Account.create({
    tenantId: input?.tenantId ?? ROOT_TENANT_ID,
    code: AccountCode.from(input?.code ?? '1000'),
    name: input?.name ?? 'Cash',
    type: AccountType.from(input?.type ?? 'asset'),
    normalBalance: NormalBalance.from(input?.normalBalance ?? 'debit'),
    postable: input?.postable ?? false,
    active: input?.active ?? true,
    system: input?.system ?? false,
    id: input?.id,
    now: now(),
  });
}

function makeChildAccount(parent: Account, input?: {
  readonly code?: string;
  readonly name?: string;
  readonly type?: string;
  readonly normalBalance?: string;
  readonly postable?: boolean;
  readonly active?: boolean;
  readonly system?: boolean;
  readonly id?: string;
  readonly tenantId?: string;
}): Account {
  return Account.createAsChild({
    parent,
    tenantId: input?.tenantId ?? parent.tenantId,
    code: AccountCode.from(input?.code ?? '1100'),
    name: input?.name ?? 'Bank',
    type: input?.type ? AccountType.from(input.type) : parent.type,
    normalBalance: input?.normalBalance
      ? NormalBalance.from(input.normalBalance)
      : parent.normalBalance,
    postable: input?.postable ?? false,
    active: input?.active ?? true,
    system: input?.system ?? false,
    id: input?.id,
    now: now(),
  });
}

describe('Account aggregate', () => {
  describe('root account creation', () => {
    it('creates a valid root account with level 1 and no parent', () => {
      const account = makeRootAccount();

      expect(account.level).toBe(1);
      expect(account.parentId).toBeNull();
      expect(account.tenantId).toBe(ROOT_TENANT_ID);
      expect(account.code.value).toBe('1000');
      expect(account.name).toBe('Cash');
      expect(account.postable).toBe(false);
      expect(account.active).toBe(true);
      expect(account.system).toBe(false);
    });

    it('generates a stable UUID-shaped identity that never changes', () => {
      const account1 = makeRootAccount();
      const account2 = makeRootAccount();

      expect(account1.id.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(account1.id.value).toBe(account1.id.value);
      expect(account2.id.value).not.toBe(account1.id.value);
    });

    it('creates a root account with explicit identity', () => {
      const account = makeRootAccount({ id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70' });

      expect(account.id.value).toBe('018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70');
    });

    it('creates a postable root account (leaf, no children)', () => {
      const account = makeRootAccount({ postable: true });

      expect(account.postable).toBe(true);
      expect(account.level).toBe(1);
      expect(account.parentId).toBeNull();
    });
  });

  describe('child account creation', () => {
    it('creates a child account with level = parent.level + 1', () => {
      const parent = makeRootAccount();
      const child = makeChildAccount(parent);

      expect(child.level).toBe(2);
      expect(child.parentId).not.toBeNull();
      expect(child.parentId).toContain(parent.id.value);
    });

    it('inherits the parent\'s type', () => {
      const parent = makeRootAccount({ type: 'expense', normalBalance: 'debit' });
      const child = makeChildAccount(parent);

      expect(child.type.value).toBe('expense');
    });

    it('inherits the parent\'s normal balance', () => {
      const parent = makeRootAccount({ normalBalance: 'credit' });
      const child = makeChildAccount(parent);

      expect(child.normalBalance.value).toBe('credit');
    });

    it('rejects a child with a different type than parent', () => {
      const parent = makeRootAccount({ type: 'asset' });

      expect(() =>
        Account.createAsChild({
          parent,
          tenantId: parent.tenantId,
          code: AccountCode.from('1100'),
          name: 'Invalid Child',
          type: AccountType.from('expense'), // different from parent's 'asset'
          normalBalance: NormalBalance.from('debit'),
          postable: false,
          active: true,
          system: false,
          now: now(),
        }),
      ).toThrow(AccountTypeMismatchError);
    });

    it('rejects a child with a different normal balance than parent', () => {
      const parent = makeRootAccount({ normalBalance: 'debit' });

      expect(() =>
        Account.createAsChild({
          parent,
          tenantId: parent.tenantId,
          code: AccountCode.from('1100'),
          name: 'Invalid Child',
          type: AccountType.from('asset'),
          normalBalance: NormalBalance.from('credit'), // different from parent's 'debit'
          postable: false,
          active: true,
          system: false,
          now: now(),
        }),
      ).toThrow(AccountNormalBalanceMismatchError);
    });

    it('rejects a child with a different tenant than parent', () => {
      const parent = makeRootAccount({ tenantId: '018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71' });

      expect(() =>
        Account.createAsChild({
          parent,
          tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70', // different tenant
          code: AccountCode.from('1100'),
          name: 'Invalid Child',
          type: AccountType.from('asset'),
          normalBalance: NormalBalance.from('debit'),
          postable: false,
          active: true,
          system: false,
          now: now(),
        }),
      ).toThrow(AccountInvalidParentError);
    });
  });

  describe('postable invariant', () => {
    it('only a leaf account can be postable — setPostable(true) on account with children throws', () => {
      const parent = makeRootAccount({ postable: false });
      const child1 = makeChildAccount(parent);
      const child2 = makeChildAccount(parent);

      // Add children to increase child count
      parent.addChild(child1);
      parent.addChild(child2);

      expect(() => parent.setPostable(true, now())).toThrow(
        AccountPostableNotLeafError,
      );
    });

    it('a postable account with no children can have postable set to true', () => {
      const parent = makeRootAccount({ postable: false });

      parent.setPostable(true, now());

      expect(parent.postable).toBe(true);
    });

    it('a postable account cannot receive children — addChild throws', () => {
      const parent = makeRootAccount({ postable: true });

      expect(() => parent.addChild(makeChildAccount(parent))).toThrow(
        AccountPostableWithChildrenError,
      );
    });

    it('adding children to postable account then setting postable false works', () => {
      const parent = makeRootAccount({ postable: false });
      parent.addChild(makeChildAccount(parent));
      parent.setPostable(false, now());

      expect(parent.postable).toBe(false);
    });
  });

  describe('system account protection', () => {
    it('a system account cannot be made postable during creation', () => {
      expect(() =>
        Account.create({
          tenantId: ROOT_TENANT_ID,
          code: AccountCode.from('1000'),
          name: 'System Cash',
          type: AccountType.from('asset'),
          normalBalance: NormalBalance.from('debit'),
          postable: true, // system + postable = error
          active: false,
          system: true,
          now: now(),
        }),
      ).toThrow(AccountSystemProtectedError);
    });

    it('a system account cannot be active during creation', () => {
      expect(() =>
        Account.create({
          tenantId: ROOT_TENANT_ID,
          code: AccountCode.from('1000'),
          name: 'System Cash',
          type: AccountType.from('asset'),
          normalBalance: NormalBalance.from('debit'),
          postable: false,
          active: true, // system + active = error
          system: true,
          now: now(),
        }),
      ).toThrow(AccountSystemProtectedError);
    });

    it('a system account cannot have its structural properties changed (rename)', () => {
      const account = makeRootAccount({ system: true, active: false });

      expect(() => account.rename('New Name', now())).toThrow(
        AccountSystemProtectedError,
      );
    });

    it('a system account cannot change active status', () => {
      const account = makeRootAccount({ system: true, active: false });

      expect(() => account.setActive(true, now())).toThrow(
        AccountSystemProtectedError,
      );
    });

    it('a system account cannot change postable status', () => {
      const account = makeRootAccount({ system: true, active: false });

      expect(() => account.setPostable(true, now())).toThrow(
        AccountSystemProtectedError,
      );
    });
  });

  describe('name validation', () => {
    it('rejects blank name during creation', () => {
      expect(() =>
        Account.create({
          tenantId: ROOT_TENANT_ID,
          code: AccountCode.from('1000'),
          name: '',
          type: AccountType.from('asset'),
          normalBalance: NormalBalance.from('debit'),
          postable: false,
          active: true,
          system: false,
          now: now(),
        }),
      ).toThrow(InvalidPrimitiveError);
    });

    it('rejects blank name during rename', () => {
      const account = makeRootAccount();

      expect(() => account.rename('', now())).toThrow(InvalidPrimitiveError);
    });

    it('trims whitespace from name', () => {
      const account = makeRootAccount({ name: '  Cash  ' });

      expect(account.name).toBe('Cash');
    });
  });

  describe('tenant isolation', () => {
    it('rejects child belonging to a different tenant', () => {
      const parent = makeRootAccount({ tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70' });

      expect(() =>
        Account.createAsChild({
          parent,
          tenantId: '018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71', // different tenant
          code: AccountCode.from('1100'),
          name: 'Invalid Child',
          type: AccountType.from('asset'),
          normalBalance: NormalBalance.from('debit'),
          postable: false,
          active: true,
          system: false,
          now: now(),
        }),
      ).toThrow(AccountInvalidParentError);
    });
  });

  describe('level derivation', () => {
    it('child level is always parent.level + 1', () => {
      const parent = makeRootAccount(); // level 1
      const child1 = makeChildAccount(parent); // level 2
      const child2 = makeChildAccount(parent); // level 2

      expect(child1.level).toBe(2);
      expect(child2.level).toBe(2);
    });

    it('grandchild level is parent.level + 2', () => {
      const parent = makeRootAccount(); // level 1
      const child = makeChildAccount(parent); // level 2
      const grandchild = makeChildAccount(child); // level 3

      expect(grandchild.level).toBe(3);
    });
  });

  describe('rehydration', () => {
    it('rebuilds stored state through the same value objects', () => {
      const account = makeRootAccount();
      const snapshot = account.snapshot();

      const rehydrated = Account.rehydrate(snapshot);

      expect(rehydrated.id.value).toBe(account.id.value);
      expect(rehydrated.code.value).toBe(account.code.value);
      expect(rehydrated.tenantId).toBe(account.tenantId);
      expect(rehydrated.name).toBe(account.name);
      expect(rehydrated.level).toBe(account.level);
      expect(rehydrated.parentId).toBe(account.parentId);
      expect(rehydrated.type.value).toBe(account.type.value);
      expect(rehydrated.normalBalance.value).toBe(account.normalBalance.value);
      expect(rehydrated.postable).toBe(account.postable);
      expect(rehydrated.active).toBe(account.active);
      expect(rehydrated.system).toBe(account.system);
    });

    it('refuses a stored record with invalid type string', () => {
      expect(() =>
        Account.rehydrate({
          ...makeRootAccount().snapshot(),
          type: 'invalid_type' as never,
        }),
      ).toThrow(InvalidPrimitiveError);
    });

    it('refuses a stored record with invalid normal balance string', () => {
      expect(() =>
        Account.rehydrate({
          ...makeRootAccount().snapshot(),
          normalBalance: 'invalid' as never,
        }),
      ).toThrow(InvalidPrimitiveError);
    });
  });
});