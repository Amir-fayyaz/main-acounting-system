import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_ENV, validateEnv } from '@shared/application';

/**
 * Composition root for application configuration. ConfigModule loads the
 * `.env` file into process.env; the APP_ENV provider validates it once through
 * the dependency-free validateEnv() and exposes the typed AppEnv for
 * injection. Validation runs at bootstrap, so misconfiguration fails fast.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
  ],
  providers: [
    {
      provide: APP_ENV,
      useFactory: () => validateEnv(),
    },
  ],
  exports: [APP_ENV],
})
export class AppConfigModule {}
