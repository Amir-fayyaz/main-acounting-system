import type { AccountRole } from '../value-objects/account-role.js';

export interface AccountRoleMapping {
  readonly tenantId: string;
  readonly role: AccountRole;
  readonly accountId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AccountRoleRepository {
  findByRole(tenantId: string, role: AccountRole): Promise<AccountRoleMapping | undefined>;

  findByAccount(tenantId: string, accountId: string): Promise<readonly AccountRoleMapping[]>;

  findAll(tenantId: string): Promise<readonly AccountRoleMapping[]>;

  save(mapping: AccountRoleMapping): Promise<void>;

  remove(tenantId: string, role: AccountRole): Promise<void>;
}
