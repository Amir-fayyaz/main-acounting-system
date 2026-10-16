import { validateMatches, validateNonBlank } from '../../../shared/primitives/assert.js';

/**
 * The identifier rule the audit record applies to every reference it stores
 * (AUD-001; SHR-003 section 7; SHR-007).
 *
 * A tenant id, an actor user id, a resource id and the correlation/causation
 * pair are all *references to something else*, and the audit record never
 * interprets them: it stores them and gives them back. They therefore follow
 * the same rule the message metadata already applies to an opaque identifier —
 * letters, digits, `.`, `_`, `:` and `-`, at most 128 characters — so the audit
 * record cannot become a place where an unbounded value (a payload, an object,
 * a query) is smuggled into an identity field.
 *
 * The rule is deliberately shared and identical to the kernel's, not a
 * re-invention: an audit record naming the tenant context must accept exactly
 * what `createTenantContext` accepts (SHR-007), or the two boundaries could
 * disagree about which identifiers exist.
 */
const OPAQUE_IDENTIFIER = /^[A-Za-z0-9._:-]{1,128}$/;

export const OPAQUE_IDENTIFIER_EXPECTATION =
  'a short opaque identifier of at most 128 characters (letters, digits, ".", "_", ":", "-")';

/** Validates an opaque identifier and returns it normalized (trimmed). */
export function assertOpaqueIdentifier(value: string, primitive: string, field: string): string {
  const normalized = validateNonBlank(value, primitive, field);

  return validateMatches(
    normalized,
    OPAQUE_IDENTIFIER,
    primitive,
    field,
    OPAQUE_IDENTIFIER_EXPECTATION,
  );
}

/** Whether `value` is an opaque identifier this rule would accept. */
export function isOpaqueIdentifier(value: string): boolean {
  return typeof value === 'string' && OPAQUE_IDENTIFIER.test(value.trim());
}
