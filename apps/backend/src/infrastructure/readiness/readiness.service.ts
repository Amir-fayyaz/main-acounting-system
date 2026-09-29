import { Inject, Injectable } from '@nestjs/common';
import { SECRET_REDACTOR } from '../config/app-config.tokens.js';
import type { SecretHolder } from '../config/secrets.js';
import { READINESS_PROBES } from './readiness.tokens.js';
import type { DependencyCheck, DependencyProbe, ReadinessReport } from './readiness.types.js';

const PROBE_TIMEOUT_MS = 3000;

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function withTimeout(operation: Promise<void>, probeName: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${probeName} check timed out after ${PROBE_TIMEOUT_MS}ms`));
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

async function runProbe(probe: DependencyProbe, secrets: SecretHolder): Promise<DependencyCheck> {
  const startedAt = Date.now();

  try {
    await withTimeout(probe.check(), probe.name);
    return { name: probe.name, status: 'up', latencyMs: Date.now() - startedAt };
  } catch (error) {
    // The failure is reported to the caller with its cause; it is never swallowed
    // (Engineering Principles, rule 5). Driver errors can embed connection
    // details, so the message is redacted before it leaves the process
    // (06-security-engineering: no secret in error output).
    return {
      name: probe.name,
      status: 'down',
      latencyMs: Date.now() - startedAt,
      error: secrets.redact(toMessage(error)),
    };
  }
}

/**
 * Reports whether the process is ready to serve traffic by checking the
 * infrastructure it depends on (MySQL, Redis, object storage).
 *
 * Probes run in parallel and are bounded, so a hung dependency reports as `down`
 * instead of hanging the endpoint. Readiness is infrastructure state only: no
 * business rule and no tenant data is evaluated here, and no credential is part
 * of the report.
 */
@Injectable()
export class ReadinessService {
  constructor(
    @Inject(READINESS_PROBES) private readonly probes: readonly DependencyProbe[],
    @Inject(SECRET_REDACTOR) private readonly secrets: SecretHolder,
  ) {}

  async check(): Promise<ReadinessReport> {
    const checks = await Promise.all(this.probes.map((probe) => runProbe(probe, this.secrets)));
    const ready = checks.every((check) => check.status === 'up');

    return { status: ready ? 'ready' : 'not-ready', checks };
  }
}
