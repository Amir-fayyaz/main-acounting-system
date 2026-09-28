import { Inject, Injectable } from '@nestjs/common';
import { APP_ENVIRONMENT } from './app-config.tokens.js';
import type {
  DatabaseEnvironment,
  Environment,
  HttpEnvironment,
  NodeEnvironment,
} from './environment.js';

/**
 * Typed read access to the validated environment.
 *
 * Business modules may use this service for technical configuration only; domain
 * code must keep depending on abstractions instead.
 */
@Injectable()
export class AppConfigService {
  constructor(@Inject(APP_ENVIRONMENT) private readonly environment: Environment) {}

  get nodeEnv(): NodeEnvironment {
    return this.environment.nodeEnv;
  }

  get isProduction(): boolean {
    return this.environment.nodeEnv === 'production';
  }

  get http(): HttpEnvironment {
    return this.environment.http;
  }

  get host(): string {
    return this.environment.http.host;
  }

  get port(): number {
    return this.environment.http.port;
  }

  get apiPrefix(): string {
    return this.environment.http.apiPrefix;
  }

  get database(): DatabaseEnvironment {
    return this.environment.database;
  }
}
