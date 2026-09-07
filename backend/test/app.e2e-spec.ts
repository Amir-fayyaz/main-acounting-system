import { createServer } from 'node:net';
import type { Server, Socket } from 'node:net';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '@app/app.module';

interface StubService {
  readonly port: number;
  close(): Promise<void>;
}

function startStub(onConnection: (socket: Socket) => void): Promise<StubService> {
  return new Promise((resolve) => {
    const sockets = new Set<Socket>();
    const server: Server = createServer((socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
      onConnection(socket);
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address !== null && typeof address === 'object') {
        let closed = false;
        resolve({
          port: address.port,
          close: () =>
            new Promise<void>((done) => {
              if (closed) {
                done();
                return;
              }
              closed = true;
              for (const socket of sockets) {
                socket.destroy();
              }
              server.close(() => done());
            }),
        });
      }
    });
  });
}

interface ReadinessCheck {
  name: string;
  status: string;
  latencyMs: number;
}

interface ReadinessBody {
  status: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  checks: ReadinessCheck[];
}

describe('App (e2e)', () => {
  let app: INestApplication;
  let postgresStub: StubService;
  let redisStub: StubService;

  beforeAll(async () => {
    // Postgres stub: accepts TCP connections (the probe only checks reachability).
    postgresStub = await startStub(() => undefined);
    // Redis stub: answers a raw PING with +PONG.
    redisStub = await startStub((socket) => {
      socket.on('data', (chunk: Buffer) => {
        if (chunk.toString('utf8').includes('PING')) {
          socket.write('+PONG\r\n');
        }
      });
    });

    process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${postgresStub.port}/accounting_saas_test?schema=public`;
    process.env.REDIS_URL = `redis://127.0.0.1:${redisStub.port}/0`;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await postgresStub.close();
    await redisStub.close();
  });

  describe('liveness', () => {
    it('responds on the health endpoint', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('readiness', () => {
    it('reports ready with per-dependency checks when all services are reachable', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
      const body = response.body as ReadinessBody;

      expect(body.status).toBe('ok');
      expect(body.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(body.uptimeSeconds).toEqual(expect.any(Number));
      expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);

      const names: string[] = body.checks.map((check) => check.name);
      expect(names.sort()).toEqual(['postgres', 'process', 'redis']);

      for (const check of body.checks) {
        expect(check.status).toBe('ok');
        expect(check.latencyMs).toEqual(expect.any(Number));
      }
    });

    it('returns 503 and flags the down dependencies when services are unreachable', async () => {
      await postgresStub.close();
      await redisStub.close();

      const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(503);
      const body = response.body as ReadinessBody;

      expect(body.status).toBe('error');

      const byName = new Map<string, ReadinessCheck>(body.checks.map((check) => [check.name, check]));
      expect(byName.get('postgres')?.status).toBe('error');
      expect(byName.get('redis')?.status).toBe('error');
      expect(byName.get('process')?.status).toBe('ok');
    });
  });
});
