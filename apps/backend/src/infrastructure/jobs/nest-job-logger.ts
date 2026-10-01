import { Inject, Injectable, Logger } from '@nestjs/common';
import { SECRET_REDACTOR } from '../config/app-config.tokens.js';
import type { SecretHolder } from '../config/secrets.js';
import type { JobLogFields, JobLogger } from './job.types.js';

type Level = 'log' | 'warn' | 'error';

/**
 * The infrastructure's execution logging hook (FND-007, 10-observability).
 *
 * Each line is one JSON object carrying the job id, type, attempt, correlation
 * id, duration, status and failure category, so a later metrics layer can read
 * the fields without parsing prose. A failure message is redacted through the
 * same secret redactor the rest of the app uses: a job error must not leak a
 * credential into a log (06-security-engineering).
 *
 * This is deliberately not a full observability stack — metrics, tracing and
 * queue-depth reporting are a separate concern.
 */
@Injectable()
export class NestJobLogger implements JobLogger {
  private readonly logger = new Logger('Job');

  constructor(@Inject(SECRET_REDACTOR) private readonly secrets: SecretHolder) {}

  info(message: string, fields: JobLogFields): void {
    this.write('log', message, fields);
  }

  warn(message: string, fields: JobLogFields): void {
    this.write('warn', message, fields);
  }

  error(message: string, fields: JobLogFields): void {
    this.write('error', message, fields);
  }

  private write(level: Level, message: string, fields: JobLogFields): void {
    this.logger[level](`${message} ${JSON.stringify(this.redact(fields))}`);
  }

  private redact(fields: JobLogFields): JobLogFields {
    if (fields.error === undefined) {
      return fields;
    }

    return {
      ...fields,
      error: { ...fields.error, message: this.secrets.redact(fields.error.message) },
    };
  }
}
