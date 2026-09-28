import type { INestApplication } from '@nestjs/common';
import { AppConfigService } from './infrastructure/config/app-config.service.js';

/**
 * Applies the runtime configuration shared by the real process and the tests,
 * so an e2e test exercises the same HTTP boundary as production.
 */
export function configureApplication(app: INestApplication): AppConfigService {
  const config = app.get(AppConfigService);

  app.setGlobalPrefix(config.apiPrefix);
  app.enableShutdownHooks();

  return config;
}
