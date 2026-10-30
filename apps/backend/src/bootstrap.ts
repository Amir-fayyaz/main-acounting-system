import { VersioningType, type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { API_VERSION } from './infrastructure/api/api.constants.js';
import { correlationIdMiddleware } from './infrastructure/api/correlation/correlation-id.js';
import { ApiExceptionFilter } from './infrastructure/api/errors/api-exception.filter.js';
import { setupOpenApi } from './infrastructure/api/openapi/openapi.js';
import { createApiValidationPipe } from './infrastructure/api/validation/api-validation.pipe.js';
import { ActorScopeInterceptor } from './infrastructure/api/actor/actor-scope.interceptor.js';
import { TenantScopeInterceptor } from './infrastructure/api/tenant/tenant-scope.interceptor.js';
import { AppConfigService } from './infrastructure/config/app-config.service.js';
import { processSecretRedactor } from './infrastructure/config/secrets.js';
import type { Logger } from './infrastructure/logging/logger.js';
import { createLogger } from './infrastructure/logging/structured-logger.js';

/**
 * Applies the runtime configuration shared by the real process and the tests,
 * so an e2e test exercises the same HTTP boundary as production.
 *
 * The API conventions (FND-006) are installed here, once, instead of per
 * controller or per module:
 *
 * - a global `/api` prefix and URI versioning defaulting to `v1`, so every
 *   module is versioned identically and none hardcodes a version segment;
 * - a correlation id on every request, assigned before any route;
 * - the shared input-validation pipe;
 * - the shared exception filter, so every failure leaves in one error contract;
 * - the actor-scope interceptor, which publishes the authenticated principal the
 *   guard verified as the ambient actor a security-audit record is filed under
 *   (AUD-001);
 * - the tenant-scope interceptor, which publishes the verified route tenant as
 *   the ambient company boundary for tenant-scoped handlers (TNT-002; SHR-007);
 * - the generated OpenAPI document, in development and test only.
 *
 * `logger` is the process logging layer (FND-011). The real process passes the
 * one it built before the container existed; a test harness that assembles a
 * subset of modules gets the same configuration-derived logger, so the
 * exception filter always has a contract to write through rather than a reason
 * to skip logging.
 */
export function configureApplication(app: INestApplication, logger?: Logger): AppConfigService {
  const config = app.get(AppConfigService);
  const reflector = app.get(Reflector);
  const structuredLogger =
    logger ??
    createLogger({
      service: config.runtime.serviceName,
      level: config.logging.level,
      format: config.logging.format,
      secrets: processSecretRedactor(),
    });

  app.setGlobalPrefix(config.apiPrefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: API_VERSION });

  app.use(correlationIdMiddleware);
  app.useGlobalPipes(createApiValidationPipe());
  // The filter logs a 5xx through the structured logger (FND-011).
  app.useGlobalFilters(new ApiExceptionFilter(structuredLogger));
  // Order: tenant scope first so the handler (and any nested actor work) sees
  // an established tenant when the route is tenant-scoped; actor scope second.
  app.useGlobalInterceptors(new TenantScopeInterceptor(reflector), new ActorScopeInterceptor());

  setupOpenApi(app, config, structuredLogger);
  app.enableShutdownHooks();

  app.enableCors({
    origin: ['http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  });
  return config;
}
