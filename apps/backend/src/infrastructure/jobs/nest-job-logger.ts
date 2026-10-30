import { Inject, Injectable } from '@nestjs/common';
import type { Logger } from '../logging/logger.js';
import { LOGGER } from '../logging/logging.tokens.js';
import type { JobLogFields, JobLogger } from './job.types.js';

/**
 * The infrastructure's execution logging hook (FND-007, 10-observability).
 *
 * Each line carries the job id, type, attempt, correlation id, duration, status
 * and failure category as structured detail, so a later metrics layer can read
 * the fields without parsing prose. Since FND-011 it goes through the structured
 * logger, which applies the same redaction pass to every string it writes — a
 * job error can no longer leak a credential into a log
 * (06-security-engineering).
 *
 * The `detail` shape is deliberately unchanged: only the line around it became
 * JSON, so whatever reads these fields keeps working.
 *
 * This is deliberately not a full observability stack — metrics, tracing and
 * queue-depth reporting are a separate concern.
 */
@Injectable()
export class NestJobLogger implements JobLogger {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  info(message: string, fields: JobLogFields): void {
    this.logger.info(message, { detail: toDetail(fields) });
  }

  warn(message: string, fields: JobLogFields): void {
    this.logger.warn(message, { detail: toDetail(fields) });
  }

  error(message: string, fields: JobLogFields): void {
    this.logger.error(message, { detail: toDetail(fields) });
  }
}

/**
 * The job fields as log detail.
 *
 * Passed through untouched, including the execution's own correlation id: a job
 * that ran in a Worker has no ambient request context, so its detail is the only
 * place the id can live. Redaction is the logger's job, not this adapter's.
 */
function toDetail(fields: JobLogFields): Record<string, unknown> {
  return { ...fields };
}
