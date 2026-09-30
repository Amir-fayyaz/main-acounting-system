import { Logger, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { AppConfigService } from '../../config/app-config.service.js';
import { API_VERSION, OPENAPI_DOCUMENT_PATH } from '../api.constants.js';

/**
 * Generates and mounts the OpenAPI contract (FND-006, TECH-010).
 *
 * The document is generated from the running application — controllers,
 * decorators and DTO metadata — so it cannot drift from what is actually served;
 * nothing here is a hand-written spec. It is mounted on the Express adapter
 * directly, which is why the path is independent of `setGlobalPrefix`.
 *
 * Exposure is deliberately limited to development and test: an installation in
 * production returns the platform's normal 404 for this path. Publishing an
 * internal contract is a security decision that belongs to the API-hardening
 * work, not to the baseline (06-security-engineering).
 */
export function setupOpenApi(app: INestApplication, config: AppConfigService): void {
  if (config.environment.isProduction) {
    return;
  }

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Accounting SaaS API')
      .setDescription(
        'Versioned REST contract for the Accounting SaaS platform, generated from the running API.',
      )
      .setVersion(API_VERSION)
      .addServer(config.apiPrefix)
      .build(),
  );

  const path = `${config.apiPrefix}/${OPENAPI_DOCUMENT_PATH}`;

  SwaggerModule.setup(path, app, document, {
    jsonDocumentUrl: `${path}-json`,
    yamlDocumentUrl: `${path}-yaml`,
  });

  Logger.log(
    `OpenAPI documentation available at http://${config.host}:${config.port}${path}`,
    'OpenApi',
  );
}
