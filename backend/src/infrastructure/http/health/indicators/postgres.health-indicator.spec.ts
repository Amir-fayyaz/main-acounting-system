import { createServer } from 'node:net';
import type { Server, Socket } from 'node:net';
import type { AppEnv } from '@shared/application';
import { PostgresHealthIndicator } from './postgres.health-indicator';

const BASE_ENV: AppEnv = {
  nodeEnv: 'test',
  port: 3000,
  databaseUrl: 'postgresql://postgres:postgres@localhost:5432/db?schema=public',
  redisUrl: 'redis://localhost:6379',
  jwtAccessSecret: 'x'.repeat(32),
  jwtAccessTtl: '15m',
  jwtRefreshTtl: '30d',
  corsOrigins: ['http://localhost:3001'],
};

function envWith(overrides: Partial<AppEnv>): AppEnv {
  return { ...BASE_ENV, ...overrides };
}

interface StubServer {
  readonly server: Server;
  readonly port: number;
  readonly sockets: Set<Socket>;
}

function listen(): Promise<StubServer> {
  return new Promise((resolve) => {
    const sockets = new Set<Socket>();
    const server = createServer((socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address !== null && typeof address === 'object') {
        resolve({ server, port: address.port, sockets });
      }
    });
  });
}

async function closeStub(stub: StubServer): Promise<void> {
  for (const socket of stub.sockets) {
    socket.destroy();
  }
  await new Promise<void>((resolve) => stub.server.close(() => resolve()));
}

describe('PostgresHealthIndicator', () => {
  it('reports ok when the database host accepts TCP connections', async () => {
    const stub = await listen();
    try {
      const indicator = new PostgresHealthIndicator(
        envWith({ databaseUrl: `postgresql://postgres:postgres@127.0.0.1:${stub.port}/db` }),
      );

      const result = await indicator.check();

      expect(result).toEqual({
        name: 'postgres',
        status: 'ok',
        latencyMs: expect.any(Number),
        details: { target: `127.0.0.1:${stub.port}` },
      });
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    } finally {
      await closeStub(stub);
    }
  });

  it('reports error when the database host is unreachable', async () => {
    const stub = await listen();
    await closeStub(stub);

    const indicator = new PostgresHealthIndicator(
      envWith({ databaseUrl: `postgresql://postgres:postgres@127.0.0.1:${stub.port}/db` }),
    );

    const result = await indicator.check();

    expect(result.status).toBe('error');
    expect(result.message).toBeDefined();
  });
});
