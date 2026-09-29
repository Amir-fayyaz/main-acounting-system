/**
 * Injection tokens for the configuration layer (FND-003).
 *
 * Dependency Injection happens through contracts/tokens, not concrete classes
 * (TECH-001), so consumers depend on the token and the typed `Configuration`
 * shape instead of on the loader that produced it.
 */

/** The validated, typed configuration object. */
export const APP_CONFIGURATION = Symbol('APP_CONFIGURATION');

/**
 * Scrubs the credentials this process holds out of any message that leaves it
 * (logs, exceptions, health responses).
 */
export const SECRET_REDACTOR = Symbol('SECRET_REDACTOR');
