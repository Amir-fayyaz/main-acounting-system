import { Controller, Get, Inject, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { configureApplication } from '../src/bootstrap.js';
import { AppConfigModule } from '../src/infrastructure/config/app-config.module.js';
import { LoggingModule } from '../src/infrastructure/logging/logging.module.js';
import { Public } from '../src/infrastructure/api/authorization/authorization-policy.js';
import type { Logger } from '../src/infrastructure/logging/logger.js';
import { LOGGER } from '../src/infrastructure/logging/logging.tokens.js';
import { ActorScope } from '../src/shared/actor/actor-scope.js';
import { TenantScope } from '../src/shared/tenant/tenant-scope.js';

const SECRET = 'storage-secret-in-the-connection-error';

/**
 * The logging baseline through the real HTTP boundary (FND-011).
 *
 * The application is built exactly as the process builds it, with the one
 * difference a test needs: `process.stdout`/`process.stderr` are captured, so
 * the assertions are made on the lines a container would see.
 *
 * The probe routes exist because the properties under test — a 5xx being
 * logged, a 4xx not being logged, context following the async chain — are
 * boundary behaviour, not controller behaviour.
 */
@Controller('logging-probe')
class LoggingProbeController {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  @Public()
  @Get('boom')
  boom(): never {
    throw new Error(`connect ECONNREFUSED (${SECRET})`);
  }

  @Public()
  @Get('fine')
  fine(): { ok: true } {
    return { ok: true };
  }

  @Public()
  @Get('context')
  async context(): Promise<{ ok: true }> {
    await TenantScope.run({ state: 'available', tenantId: 'tenant-42' }, async () =>
      ActorScope.run('user-7', async () => {
        await Promise.resolve();
        this.logger.info('tenant-scoped work');
      }),
    );

    return { ok: true };
  }
}

interface Capture {
  out: string[];
  err: string[];
  restore(): void;
}

/** Captures the process streams for the duration of one class of assertions. */
function captureStreams(): Capture {
  const out: string[] = [];
  const err: string[] = [];
  const outSpy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: string | Uint8Array): boolean => {
      out.push(String(chunk));
      return true;
    });
  const errSpy = vi
    .spyOn(process.stderr, 'write')
    .mockImplementation((chunk: string | Uint8Array): boolean => {
      err.push(String(chunk));
      return true;
    });

  return {
    out,
    err,
    restore: () => {
      outSpy.mockRestore();
      errSpy.mockRestore();
    },
  };
}

/** Parses captured lines, ignoring anything that is not a JSON record. */
function parseJsonLines(lines: readonly string[]): Record<string, unknown>[] {
  return lines
    .join('')
    .split('\n')
    .filter((line) => line.trim().startsWith('{'))
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe('structured logging (e2e)', () => {
  let app: INestApplication;
  let capture: Capture;

  beforeAll(async () => {
    // The redactor is built from the process values, so the secret the probe
    // throws must be a configured one for the assertion to mean anything. The
    // storage key is used rather than a database one so the stub cannot change
    // the credentials a test would connect with.
    vi.stubEnv('MINIO_SECRET_KEY', SECRET);
    vi.stubEnv('LOG_FORMAT', 'json');
    vi.stubEnv('LOG_LEVEL', 'debug');

    // Configuration and logging only: the boundary behaviour under test does
    // not need the business modules (and must not need their database).
    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, LoggingModule],
      controllers: [LoggingProbeController],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterEach(() => {
    capture.restore();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    capture = captureStreams();
  });

  it('carries the request correlation id on a line emitted deep in the chain', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/logging-probe/context')
      .set('x-correlation-id', 'corr-e2e-1')
      .expect(200);

    const records = parseJsonLines(capture.out);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      level: 'info',
      service: 'backend',
      message: 'tenant-scoped work',
      correlationId: 'corr-e2e-1',
      tenantId: 'tenant-42',
      userId: 'user-7',
    });
  });

  it('logs a 5xx once, redacted, with its stack — and never in the response body', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/logging-probe/boom')
      .set('x-correlation-id', 'corr-e2e-2')
      .expect(500);

    const records = parseJsonLines(capture.err);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      level: 'error',
      correlationId: 'corr-e2e-2',
    });
    expect(String(records[0]?.['message'])).toContain('INTERNAL_ERROR');

    const detail = records[0]?.['detail'] as Record<string, unknown> | undefined;
    expect(detail?.['stack']).toBeTypeOf('string');
    expect(JSON.stringify(records[0])).not.toContain(SECRET);
    expect(JSON.stringify(records[0])).toContain('[redacted]');

    expect(JSON.stringify(response.body)).not.toContain('stack');
    expect(JSON.stringify(response.body)).not.toContain(SECRET);
    expect(response.body).toMatchObject({
      error: { correlationId: 'corr-e2e-2', category: 'technical' },
    });
  });

  it('does not log a 4xx on the server side', async () => {
    await request(app.getHttpServer()).get('/api/v1/logging-probe/missing').expect(404);

    expect(parseJsonLines(capture.err)).toHaveLength(0);
    expect(parseJsonLines(capture.out)).toHaveLength(0);
  });

  it('does not log a successful request', async () => {
    await request(app.getHttpServer()).get('/api/v1/logging-probe/fine').expect(200);

    expect(parseJsonLines(capture.out)).toHaveLength(0);
    expect(parseJsonLines(capture.err)).toHaveLength(0);
  });
});
