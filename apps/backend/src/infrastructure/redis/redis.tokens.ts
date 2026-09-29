/**
 * Token for the Redis client used by infrastructure-level concerns (event bus,
 * queue, controlled caches) per TECH-007.
 *
 * Redis is never a source of truth for financial or business state, and Domain
 * code must not depend on this token: consumers reach Redis through a Port that
 * ADR-002 (section 15) requires for infrastructure access.
 */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
