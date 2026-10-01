import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadConfiguration } from '../infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../infrastructure/config/dotenv.js';
import { JobEnqueuer } from '../infrastructure/jobs/job-enqueuer.js';
import { redactProcessSecrets } from '../infrastructure/config/secrets.js';
import { toNestLogLevels } from '../nest-log-levels.js';
import { CliModule } from './cli.module.js';

const USAGE = 'Usage: node dist/cli/enqueue-sample-job.js <job-type> [payload-json]';

/**
 * Enqueues a job for local verification (FND-007).
 *
 * Example:
 *
 * ```bash
 * node dist/cli/enqueue-sample-job.js sample.echo '{"message":"hi"}'
 * node dist/cli/enqueue-sample-job.js sample.retry-then-succeed '{"succeedOnAttempt":3}'
 * node dist/cli/enqueue-sample-job.js sample.retry-exhausted
 * node dist/cli/enqueue-sample-job.js sample.terminal-failure
 * ```
 */
async function main(): Promise<void> {
  loadDotEnvFiles();
  const configuration = loadConfiguration();

  const app = await NestFactory.createApplicationContext(CliModule, {
    logger: toNestLogLevels(configuration.logging.level),
  });

  try {
    const [type, payloadJson] = process.argv.slice(2);

    if (type === undefined || type.length === 0) {
      Logger.error(USAGE, 'JobCli');
      process.exitCode = 1;
      return;
    }

    const payload: unknown = payloadJson === undefined ? {} : JSON.parse(payloadJson);
    const envelope = await app.get(JobEnqueuer).enqueue({ type, payload, enqueuedBy: 'cli' });

    Logger.log(
      `Enqueued ${envelope.type} (jobId ${envelope.jobId}, attempt 1/${envelope.maxAttempts})`,
      'JobCli',
    );
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const details = error instanceof Error ? (error.stack ?? error.message) : String(error);

  Logger.error(redactProcessSecrets(details), 'JobCli');
  process.exitCode = 1;
});
