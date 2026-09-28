/**
 * Tokens for shared database infrastructure.
 *
 * Persistence adapters of each module receive these tokens; the pool and the
 * Drizzle instance never leak into Domain code (TECH-003, ADR-002 section 14).
 */
export const MYSQL_CONNECTION_POOL = Symbol('MYSQL_CONNECTION_POOL');
export const DATABASE = Symbol('DATABASE');
