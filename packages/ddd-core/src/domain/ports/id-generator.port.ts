/** Injection token for the IdGenerator port (framework-agnostic symbol). */
export const ID_GENERATOR = Symbol('ID_GENERATOR');

/**
 * Domain port for identifier generation. Keeps the domain independent of the
 * concrete generator strategy (UUID v4 by default, snowflake, ULID, ...).
 */
export interface IdGenerator {
  nextId(): string;
}
