import { EntityId } from '../../../../shared/id/entity-id.js';

/**
 * The fiscal period identifier (FIS-004; ADR-002 section 10).
 *
 * A fiscal period is identified by the same shared {@link EntityId} every other
 * entity uses: an opaque UUID with no tenant, no type and no ordering inside
 * it. The identity is generated once, on creation, and never changes — storage
 * enforces this through its primary key.
 */
export type FiscalPeriodId = EntityId;

/** Generates a fresh, globally unique fiscal period identity. */
export function generateFiscalPeriodId(): FiscalPeriodId {
  return EntityId.generate();
}

/** Wraps an existing fiscal period identity, e.g. one read from storage. */
export function fiscalPeriodIdFrom(value: string): FiscalPeriodId {
  return EntityId.from(value);
}
