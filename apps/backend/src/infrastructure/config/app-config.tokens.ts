/**
 * Injection token for the validated environment object.
 *
 * Dependency Injection happens through contracts/tokens, not concrete classes
 * (TECH-001), so consumers depend on the token and the typed `Environment` shape.
 */
export const APP_ENVIRONMENT = Symbol('APP_ENVIRONMENT');
