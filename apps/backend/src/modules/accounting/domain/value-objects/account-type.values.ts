import { AccountType } from './account-type.js';

/** The account type identifiers, for OpenAPI enums and DTO validation. */
export const ACCOUNT_TYPE_VALUES: readonly string[] = AccountType.VALUES.map((type) => type.value);
