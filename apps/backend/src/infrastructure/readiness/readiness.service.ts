import { Inject, Injectable, Logger } from '@nestjs/common';
import { SECRET_REDACTOR } from '../config/app-config.tokens.js';
import type { SecretHolder } from '../config/secrets.js';
import { READINESS_PROBES } from './readiness.tokens.js';
import type {
  DependencyCheck,
  DependencyFailureReason,
  DependencyProbe,
  ReadinessReport,
} from './readiness.types.js';

const PROBE_TIMEOUT_MS = 3000;

/**
 * Distinguishes "the dependency did not answer in time" from "the dependency
 * answered with a failure", so the response stays a stable enum.
 */
class ProbeTimeoutError extends Error {
  constructor(probeName: string) {
    super(`${probeName} check timed out after ${PROBE_TIMEOUT_MS}ms`);
    this.name = 'ProbeTimeoutError';
  }
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function withTimeout(operation: Promise<void>, probeName: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ProbeTimeoutError(probeName));
    }, PROBE_TIMEOUT_MS);

    operation.then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Answers "can this process serve traffic?" — the Readiness half of the
 * Liveness / Readiness / Dependency Health split required by ADR-015 section 9
 * and 10-observability.
 *
 * Behaviour that callers rely on:
 * - A failed or hanging dependency is reported, never rethrown: the process must
 *   stay up (and liveness must stay green) while a dependency is unavailable.
 * - Probes run in parallel with a hard timeout, so the endpoint stays cheap
 *   enough for repeated polling by Docker health checks and the frontend.
 * - The report carries a closed failure vocabulary only. The underlying driver
 *   message (redacted by the configuration layer's secret redactor) goes to the
 *   server log, so operators keep the detail and the API stays free of internal
 *   details and credentials.
 */
@Injectable()
export class ReadinessService {
  private readonly logger = new Logger(ReadinessService.name);

  constructor(
    @Inject(READINESS_PROBES) private readonly probes: readonly DependencyProbe[],
    @Inject(SECRET_REDACTOR) private readonly secrets: SecretHolder,
  ) {}

  async check(): Promise<ReadinessReport> {
    const checks = await Promise.all(this.probes.map((probe) => this.runProbe(probe)));
    const ready = checks.every((check) => check.status === 'up');

    return { status: ready ? 'ready' : 'not-ready', checks };
  }

  private async runProbe(probe: DependencyProbe): Promise<DependencyCheck> {
    const startedAt = Date.now();

    try {
      await withTimeout(probe.check(), probe.name);
      return { name: probe.name, status: 'up', latencyMs: Date.now() - startedAt };
    } catch (error) {
      const reason: DependencyFailureReason =
        error instanceof ProbeTimeoutError ? 'timeout' : 'unavailable';
      const latencyMs = Date.now() - startedAt;

      // The cause is reported to the operator here, never swallowed
      // (Engineering Principles, rule 5); it is redacted because driver errors
      // can carry connection details (06-security-engineering).
      this.logger.warn(
        `Readiness probe "${probe.name}" is down (${reason}): ${this.secrets.redact(toMessage(error))}`,
      );

      return { name: probe.name, status: 'down', latencyMs, reason };
    }
  }
}
