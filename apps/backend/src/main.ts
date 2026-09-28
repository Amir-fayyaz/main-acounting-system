import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApplication } from './bootstrap.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = configureApplication(app);

  await app.listen(config.port, config.host);

  Logger.log(
    `Backend listening on http://${config.host}:${config.port}${config.apiPrefix} (${config.nodeEnv})`,
    'Bootstrap',
  );
}

void bootstrap().catch((error: unknown) => {
  // Never swallow a startup failure: log the cause and fail the process so the
  // container/orchestrator can restart or surface it (Engineering Principles, rule 5).
  Logger.error(
    'Backend failed to start',
    error instanceof Error ? error.stack : String(error),
    'Bootstrap',
  );
  process.exitCode = 1;
});
