/**
 * Tokens for shared database infrastructure.
 *
 * Persistence adapters of each module receive these tokens; the pool and the
 * Drizzle instance never leak into Domain code (TECH-003, ADR-002 section 14).
 * The transaction boundary is injected the same way — into Application use
 * cases, which own it, and never into Domain, which cannot open one
 * (SHR-005, ADR-004 section 6).
 */
export const MYSQL_CONNECTION_POOL = Symbol('MYSQL_CONNECTION_POOL');
export const DATABASE = Symbol('DATABASE');
export const TRANSACTION_BOUNDARY = Symbol('TRANSACTION_BOUNDARY');
