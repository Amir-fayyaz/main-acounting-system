import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service.js';
import { APP_CONFIGURATION, SECRET_REDACTOR } from './app-config.tokens.js';
import { loadConfiguration } from './configuration.js';
import { loadDotEnvFiles } from './dotenv.js';
import { createSecretRedactor } from './secrets.js';

/**
 * Configuration is shared infrastructure, which is the one case where a global
 * Nest module is allowed (TECH-001).
 *
 * Loading and validation happen in `loadConfiguration`, a framework-free
 * function that any process can call; this module only binds its result to the
 * DI container for the HTTP process. There is no second mechanism: `ConfigService`
 * from `@nestjs/config` is gone, `.env` discovery is owned by `dotenv.ts`, and
 * the raw environment is read here and in `secrets.ts` only.
 *
 * A validation failure surfaces while the module is being created, so the
 * process refuses to start with an invalid configuration (FND-003).
 */
@Global()
@Module({
  providers: [
    {
      provide: APP_CONFIGURATION,
      useFactory: () => {
        loadDotEnvFiles();
        return loadConfiguration();
      },
    },
    AppConfigService,
    {
      provide: SECRET_REDACTOR,
      useFactory: () => createSecretRedactor(process.env),
    },
  ],
  exports: [AppConfigService, SECRET_REDACTOR],
})
export class AppConfigModule {}
