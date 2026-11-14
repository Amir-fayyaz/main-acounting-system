import { EntityId } from '../../../../shared/id/entity-id.js';

/**
 * The stable identity of an account within the chart of accounts.
 *
 * It is the shared UUID primitive under a nominal alias so the domain can
 * express `AccountId` without importing the tenant module or any transport
 * vocabulary.
 */
export type AccountId = EntityId;

/** Wraps an existing account identity, e.g. one read from storage. */
export function accountIdFrom(value: string): AccountId {
  return EntityId.from(value);
}

/** Whether `value` is a well-formed account identity. */
export function isAccountId(value: string): boolean {
  return EntityId.isValid(value);
}
