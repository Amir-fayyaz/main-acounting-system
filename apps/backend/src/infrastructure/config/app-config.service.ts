import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIGURATION } from './app-config.tokens.js';
import type {
  ApplicationRuntime,
  Configuration,
  DatabaseConfiguration,
  EnvironmentIdentification,
  HttpConfiguration,
  JobsConfiguration,
  LoggingConfiguration,
  RedisConfiguration,
  StorageConfiguration,
} from './configuration.types.js';

/**
 * Typed read access to the validated configuration (FND-003).
 *
 * Application code consumes this service instead of reading `process.env`, and
 * business modules use it for technical configuration only — Domain keeps
 * depending on abstractions (ADR-002, section 21).
 *
 * Every process that runs NestJS (HTTP, and later the worker/scheduler hosts)
 * receives the same service from the same module; nothing here is specific to
 * the HTTP process.
 */
@Injectable()
export class AppConfigService {
  constructor(@Inject(APP_CONFIGURATION) private readonly configuration: Configuration) {}

  get environment(): EnvironmentIdentification {
    return this.configuration.environment;
  }

  get runtime(): ApplicationRuntime {
    return this.configuration.runtime;
  }

  get http(): HttpConfiguration {
    return this.configuration.http;
  }

  get host(): string {
    return this.configuration.http.host;
  }

  get port(): number {
    return this.configuration.http.port;
  }

  get apiPrefix(): string {
    return this.configuration.http.apiPrefix;
  }

  get database(): DatabaseConfiguration {
    return this.configuration.database;
  }

  get redis(): RedisConfiguration {
    return this.configuration.redis;
  }

  get storage(): StorageConfiguration {
    return this.configuration.storage;
  }

  get logging(): LoggingConfiguration {
    return this.configuration.logging;
  }

  get jobs(): JobsConfiguration {
    return this.configuration.jobs;
  }
}
