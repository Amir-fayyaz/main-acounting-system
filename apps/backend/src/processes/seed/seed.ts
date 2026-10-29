import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { loadConfiguration } from '../../infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../../infrastructure/config/dotenv.js';
import { redactProcessSecrets } from '../../infrastructure/config/secrets.js';
import { toNestLogLevels } from '../../infrastructure/logging/nest-log-levels.js';
import { DevelopmentSeedRunner, SeedEnvironmentRefusedError } from './development-seed.runner.js';
import { SeedModule } from './seed.module.js';

/**
 * `pnpm seed` — the explicit development/test dataset command (DEV-001).
 *
 * It is a separate process on purpose:
 *
 * - it loads the same typed configuration and `.env` files as the API, so it
 *   runs from any working directory and refuses an invalid configuration before
 *   connecting;
 * - it refuses a `production` environment *before* the application context — and
 *   therefore any database access — is created, and the runner checks again, so
 *   the restriction is a property of the code rather than of the documentation;
 * - it provisions nothing implicitly: seeding exists only when this command is
 *   run, never during API, worker or scheduler startup.
 *
 * The summary prints fixture keys only. No email, password, token or hash is
 * ever written to the output.
 */
async function main(): Promise<void> {
  loadDotEnvFiles();
  const configuration = loadConfiguration();

  if (!configuration.environment.isDevelopment && !configuration.environment.isTest) {
    process.stderr.write(
      `${new SeedEnvironmentRefusedError(configuration.environment.name).message}\n`,
    );
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: toNestLogLevels(configuration.logging.level),
  });

  try {
    const report = await app.get(DevelopmentSeedRunner).run();

    // The summary is the command's output, not diagnostic logging: it is written
    // to stdout so a `warn`/`error` log level cannot hide what the run did. It
    // names fixture keys only — never an email, password, token or hash.
    const lines = [
      `Product Owner: ${report.productOwner} (platform system-admin).`,
      ...report.entries.map(
        (entry) =>
          `${entry.outcome === 'created' ? '+' : '='} ${entry.outcome.padEnd(7)} ${entry.fixture}`,
      ),
      `Seeded the ${report.environment} dataset: ${report.created} created, ` +
        `${report.reused} reused. Repeat runs change nothing.`,
    ];
    process.stdout.write(`${lines.join('\n')}\n`);
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const details = error instanceof Error ? (error.stack ?? error.message) : String(error);

  Logger.error(redactProcessSecrets(details), 'Seed');
  process.exitCode = 1;
});
