import { NormalBalance } from './account-normal-balance.js';

/** The normal-balance identifiers, for OpenAPI enums and DTO validation. */
export const NORMAL_BALANCE_VALUES: readonly string[] = NormalBalance.VALUES.map(
  (balance) => balance.value,
);
