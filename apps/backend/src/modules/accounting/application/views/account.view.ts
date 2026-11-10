export interface AccountView {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly level: number;
  readonly parentId: string | null;
  readonly type: string;
  readonly normalBalance: string;
  readonly postable: boolean;
  readonly active: boolean;
  readonly system: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revision: number;
}

export function toAccountView(
  account: {
    readonly id: { readonly value: string };
    readonly tenantId: string;
    readonly code: { readonly value: string };
    readonly name: string;
    readonly level: number;
    readonly parentId: string | null;
    readonly type: { readonly value: string };
    readonly normalBalance: { readonly value: string };
    readonly postable: boolean;
    readonly active: boolean;
    readonly system: boolean;
    readonly createdAt: { readonly toIsoString: () => string };
    readonly updatedAt: { readonly toIsoString: () => string };
  },
  revision: number,
): AccountView {
  return {
    id: account.id.value,
    tenantId: account.tenantId,
    code: account.code.value,
    name: account.name,
    level: account.level,
    parentId: account.parentId,
    type: account.type.value,
    normalBalance: account.normalBalance.value,
    postable: account.postable,
    active: account.active,
    system: account.system,
    createdAt: account.createdAt.toIsoString(),
    updatedAt: account.updatedAt.toIsoString(),
    revision,
  };
}
