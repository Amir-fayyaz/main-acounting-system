import { Global, Module } from '@nestjs/common';

import { AppConfigModule } from '../config/app-config.module.js';
import { AppConfigService } from '../config/app-config.service.js';
import { SECRET_REDACTOR } from '../config/app-config.tokens.js';
import type { SecretHolder } from '../config/secrets.js';
import { LOGGER } from './logging.tokens.js';
import { createLogger } from './structured-logger.js';

/**
 * Binds the logging contract to the DI container (FND-011).
 *
 * Global, like configuration, and for the same reason: every module logs, and
 * threading an import through thirty feature modules would make a cross-cutting
 * concern look like a feature dependency. Nothing else is global — this module
 * exposes one token and no behaviour.
 *
 * The composition happens here, once: the format and level come from validated
 * configuration, and the redactor is the one the process already holds
 * (`SECRET_REDACTOR`). No consumer reads `process.env`, picks a format, or
 * builds a redactor of its own.
 */
@Global()
@Module({
  imports: [AppConfigModule],
  providers: [
    {
      provide: LOGGER,
      inject: [AppConfigService, SECRET_REDACTOR],
      useFactory: (config: AppConfigService, secrets: SecretHolder) =>
        createLogger({
          service: config.runtime.serviceName,
          level: config.logging.level,
          format: config.logging.format,
          secrets,
        }),
    },
  ],
  exports: [LOGGER],
})
export class LoggingModule {}
