export const ACCOUNT_ROLES = ['inventory', 'payable', 'input_vat', 'purchase_discount'] as const;

export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export const ACCOUNT_ROLE_LABELS: Record<AccountRole, string> = {
  inventory: 'Inventory',
  payable: 'Payable',
  input_vat: 'Input VAT',
  purchase_discount: 'Purchase Discount',
};

/**
 * Compatibility rules are centralized here.
 *
 * purchase_discount is intentionally not assigned a type yet:
 * its correct account classification must be confirmed against
 * the project's accounting rules before enabling that mapping.
 */
export const ACCOUNT_ROLE_ALLOWED_TYPES: Partial<Record<AccountRole, readonly string[]>> = {
  inventory: ['asset'],
  payable: ['liability'],
  input_vat: ['asset'],
};

export function isAccountRole(value: string): value is AccountRole {
  return (ACCOUNT_ROLES as readonly string[]).includes(value);
}

export function isCompatibleAccountType(role: AccountRole, accountType: string): boolean {
  const allowedTypes = ACCOUNT_ROLE_ALLOWED_TYPES[role];

  return allowedTypes !== undefined && allowedTypes.includes(accountType);
}
