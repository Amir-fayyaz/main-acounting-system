/**
 * Injection token of the logging contract (FND-011).
 *
 * A token, not a class: a consumer depends on `Logger` and never on the adapter
 * that writes the line, so the format and the stream stay an infrastructure
 * decision (TECH-001).
 */
export const LOGGER = Symbol('LOGGER');
