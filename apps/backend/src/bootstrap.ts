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
 */
export function configureApplication(app: INestApplication): AppConfigService {
  const config = app.get(AppConfigService);
  const reflector = app.get(Reflector);

  app.setGlobalPrefix(config.apiPrefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: API_VERSION });

  app.use(correlationIdMiddleware);
  app.useGlobalPipes(createApiValidationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());
  // Order: tenant scope first so the handler (and any nested actor work) sees
  // an established tenant when the route is tenant-scoped; actor scope second.
  app.useGlobalInterceptors(new TenantScopeInterceptor(reflector), new ActorScopeInterceptor());

  setupOpenApi(app, config);
  app.enableShutdownHooks();

  return config;
}
