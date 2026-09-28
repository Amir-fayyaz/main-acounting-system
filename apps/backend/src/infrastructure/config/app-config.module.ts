import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service.js';
import { APP_ENVIRONMENT } from './app-config.tokens.js';
import { loadEnvironment } from './environment.js';

/**
 * Configuration is shared infrastructure, which is the one case where a global
 * Nest module is allowed (TECH-001).
 *
 * `ConfigModule` is used only to discover and load `.env` files; validation and
 * typing are owned here so the process fails fast on an invalid configuration.
 * Paths are resolved from the process working directory, so both `pnpm dev` from
 * the app directory and a root-level invocation work.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: ['.env', '../../.env'],
    }),
  ],
  providers: [
    {
      provide: APP_ENVIRONMENT,
      useFactory: () => loadEnvironment(process.env),
    },
    AppConfigService,
  ],
  exports: [AppConfigService],
})
export class AppConfigModule {}
