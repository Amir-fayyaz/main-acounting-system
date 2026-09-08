/**
 * Public application exports for the shared kernel: ports and validation used
 * across modules.
 */
export { OutboxMessage, OutboxPort } from './ports/outbox.port';
export { HEALTH_INDICATORS } from './ports/health.port';
export type { HealthIndicator, HealthIndicatorResult, HealthReport, HealthStatus } from './ports/health.port';
export { PASSWORD_HASHER } from './ports/password-hasher.port';
export type { PasswordHasher } from './ports/password-hasher.port';
export { TOKEN_PROVIDER } from './ports/token-provider.port';
export type { TokenPayload, TokenProvider } from './ports/token-provider.port';
export type { Persistable, RepositoryPort } from './ports/repository.port';
export { validateEnv, EnvValidationError, APP_ENV } from './validation/env';
export type { AppEnv, NodeEnv } from './validation/env';
