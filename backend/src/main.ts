import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { APP_ENV } from '@shared/application';
import type { AppEnv } from '@shared/application';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // AppConfigModule validates env at bootstrap and binds the typed AppEnv.
  const env = app.get<AppEnv>(APP_ENV);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: env.corsOrigins.includes('*') ? true : env.corsOrigins,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  if (env.nodeEnv !== 'production') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Accounting SaaS API')
        .setDescription('Multi-tenant accounting backend (DDD + hexagonal).')
        .setVersion('0.1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(env.port);
  logger.log(`Application listening on port ${env.port} (${env.nodeEnv})`);
}

void bootstrap();
