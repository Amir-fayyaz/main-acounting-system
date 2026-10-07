/**
 * Typed shape of the application configuration (FND-003).
 *
 * Configuration is grouped by responsibility instead of being an unstructured
 * set of environment variables, so a consumer asks for the section it needs
 * (`config.database`) and never for a raw variable (ADR-002, section 21 — Domain
 * must not know about technical configuration).
 *
 * This file contains types only: parsing, validation and defaults live in
 * `configuration.ts`, and no framework (NestJS included) may appear here, so the
 * same object can be loaded by the HTTP process, the worker and the scheduler.
 */

/**
 * Environments the engineering workflow distinguishes. `development` and `test`
 * are the local/Docker workflow of TECH-009, `production` is the deployed
 * installation; anything else is rejected instead of being silently treated as
 * development.
 */
export type RuntimeEnvironment = 'development' | 'test' | 'production';

/** Log verbosity (ADR-015, section 3 — structured logging). */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Which environment this process runs in. The flags are derived, never set. */
export interface EnvironmentIdentification {
  readonly name: RuntimeEnvironment;
  readonly isDevelopment: boolean;
  readonly isTest: boolean;
  readonly isProduction: boolean;
}

/**
 * Application runtime identity: who this process is when it talks about itself
 * (logs, health). Worker and scheduler processes identify themselves through the
 * same key instead of inventing their own.
 */
export interface ApplicationRuntime {
  readonly serviceName: string;
}

export interface HttpConfiguration {
  readonly host: string;
  readonly port: number;
  readonly apiPrefix: string;
}

export interface DatabaseConfiguration {
  readonly host: string;
  readonly port: number;
  readonly name: string;
  readonly user: string;
  readonly password: string;
}

export interface RedisConfiguration {
  readonly host: string;
  readonly port: number;
}

export interface StorageConfiguration {
  readonly endpoint: string;
  readonly port: number;
  readonly useSsl: boolean;
  readonly accessKey: string;
  readonly secretKey: string;
  readonly bucket: string;
}

export interface LoggingConfiguration {
  readonly level: LogLevel;
}

/**
 * Worker / job execution settings (ADR-008, TECH-011).
 *
 * They are validated here so every process (HTTP, worker, scheduler) sees the
 * same contract; no job process reads the raw variables itself.
 */
export interface JobsConfiguration {
  /** How many jobs one worker process executes at a time (ADR-008, section 10). */
  readonly concurrency: number;
  /** Upper bound of attempts for a failing job before it is parked (ADR-008, section 6). */
  readonly maxAttempts: number;
  /** First backoff delay for a retryable failure; each retry doubles it (ADR-008, section 6). */
  readonly retryBaseDelayMs: number;
  /** Ceiling of the exponential backoff, so a retry never waits unbounded. */
  readonly retryMaxDelayMs: number;
}

/**
 * Authentication settings (IAM-005; TECH-006; ADR-010 section 11).
 *
 * The session lifetime is configuration, not a literal in the code, so an
 * installation can tighten it without a release and a test can state the exact
 * expiry window it exercises. It lives here with every other contract so all
 * processes validate the same value; no authentication code reads a raw
 * variable itself.
 */
export interface AuthenticationConfiguration {
  /** How long an authenticated session stays valid after it is established, in minutes. */
  readonly sessionTtlMinutes: number;
}

/** Scheduler process settings (ADR-008, section 9). */
export interface SchedulerConfiguration {
  /** How often the scheduler promotes due work and periodic triggers, in milliseconds. */
  readonly intervalMs: number;
}

/**
 * Transactional-outbox publication settings (SHR-006; ADR-004 section 12).
 *
 * They live here with every other contract so all three processes validate the
 * same values; no publisher reads a raw variable itself.
 */
export interface OutboxConfiguration {
  /** How many due records one publisher run claims at most. */
  readonly batchSize: number;
  /** Attempt budget per record; at zero the record parks as `failed`, kept for recovery. */
  readonly maxAttempts: number;
  /** First backoff delay for a transient publication failure; each attempt doubles it. */
  readonly retryBaseDelayMs: number;
  /** Ceiling of that backoff, so a failing event never pins a schedule of its own. */
  readonly retryMaxDelayMs: number;
  /** How often the Scheduler enqueues an `outbox.publish` tick (FND-007). */
  readonly publishIntervalMs: number;
}

export interface Configuration {
  readonly environment: EnvironmentIdentification;
  readonly runtime: ApplicationRuntime;
  readonly http: HttpConfiguration;
  readonly database: DatabaseConfiguration;
  readonly redis: RedisConfiguration;
  readonly storage: StorageConfiguration;
  readonly logging: LoggingConfiguration;
  readonly authentication: AuthenticationConfiguration;
  readonly jobs: JobsConfiguration;
  readonly scheduler: SchedulerConfiguration;
  readonly outbox: OutboxConfiguration;
}
