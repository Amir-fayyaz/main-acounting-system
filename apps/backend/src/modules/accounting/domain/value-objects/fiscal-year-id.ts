import { EntityId } from '../../../../shared/id/entity-id.js';

/**
 * The fiscal year identifier (FIS-002; ADR-002 section 10).
 *
 * A fiscal year is identified by the same shared {@link EntityId} every other
 * entity uses: an opaque UUID with no tenant, no type and no ordering inside
 * it. The alias is nominal only — it reads as "a fiscal year" at a call site
 * without introducing a second identity mechanism.
 *
 * The identity is generated once, on creation, and never changes; a fiscal
 * year's id is never reused for another year (storage enforces this through
 * its primary key, and nothing in this module writes a new record over an
 * existing id).
 */
export type FiscalYearId = EntityId;

/** Generates a fresh, globally unique fiscal year identity. */
export function generateFiscalYearId(): FiscalYearId {
  return EntityId.generate();
}

/** Wraps an existing fiscal year identity, e.g. one read from storage. */
export function fiscalYearIdFrom(value: string): FiscalYearId {
  return EntityId.from(value);
}

/** Whether `value` is a well-formed fiscal year identity. */
export function isFiscalYearId(value: string): boolean {
  return EntityId.isValid(value);
}
