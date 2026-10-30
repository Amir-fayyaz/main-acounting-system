import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { loadConfiguration } from '../../infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../../infrastructure/config/dotenv.js';
import { JobEnqueuer } from '../../infrastructure/jobs/job-enqueuer.js';
import { toLogError } from '../../infrastructure/logging/logger.js';
import {
  createProcessLogging,
  startupProcessLogger,
  type ProcessLogging,
} from '../../infrastructure/logging/process-logging.js';
import { CliModule } from './cli.module.js';

/** The logging layer, held outside `main` so the failure handler can reuse it. */
let logging: ProcessLogging | undefined;

const USAGE = 'Usage: node dist/processes/cli/enqueue-sample-job.js <job-type> [payload-json]';

/**
 * Enqueues a job for local verification (FND-007).
 *
 * Example:
 *
 * ```bash
 * node dist/processes/cli/enqueue-sample-job.js sample.echo '{"message":"hi"}'
 * node dist/processes/cli/enqueue-sample-job.js sample.retry-then-succeed '{"succeedOnAttempt":3}'
 * node dist/processes/cli/enqueue-sample-job.js sample.retry-exhausted
 * node dist/processes/cli/enqueue-sample-job.js sample.terminal-failure
 * ```
 */
async function main(): Promise<void> {
  loadDotEnvFiles();
  const configuration = loadConfiguration();
  logging = createProcessLogging(configuration);

  const app = await NestFactory.createApplicationContext(CliModule, {
    logger: logging.bridge,
  });

  try {
    const [type, payloadJson] = process.argv.slice(2);

    if (type === undefined || type.length === 0) {
      logging.logger.error(USAGE, { detail: { context: 'JobCli' } });
      process.exitCode = 1;
      return;
    }

    const payload: unknown = payloadJson === undefined ? {} : JSON.parse(payloadJson);
    const envelope = await app.get(JobEnqueuer).enqueue({ type, payload, enqueuedBy: 'cli' });

    logging.logger.info(
      `Enqueued ${envelope.type} (jobId ${envelope.jobId}, attempt 1/${envelope.maxAttempts})`,
      { detail: { context: 'JobCli' } },
    );
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const logger = logging?.logger ?? startupProcessLogger('job-cli');
  const details = error instanceof Error ? (error.stack ?? error.message) : String(error);

  logger.error('Job CLI failed', {
    error: toLogError(error),
    detail: { context: 'JobCli', stack: details },
  });
  process.exitCode = 1;
});
