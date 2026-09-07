import { createServer } from 'node:net';
import type { Server, Socket } from 'node:net';
import type { AppEnv } from '@shared/application';
import { RedisHealthIndicator } from './redis.health-indicator';

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

function listen(handler: (socket: Socket) => void): Promise<StubServer> {
  return new Promise((resolve) => {
    const sockets = new Set<Socket>();
    const server = createServer((socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
      handler(socket);
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

describe('RedisHealthIndicator', () => {
  it('reports ok when the server answers PING with PONG', async () => {
    const stub = await listen((socket) => {
      socket.on('data', (chunk: Buffer) => {
        if (chunk.toString('utf8').includes('PING')) {
          socket.write('+PONG\r\n');
        }
      });
    });
    try {
      const indicator = new RedisHealthIndicator(envWith({ redisUrl: `redis://127.0.0.1:${stub.port}/0` }));

      const result = await indicator.check();

      expect(result).toEqual({
        name: 'redis',
        status: 'ok',
        latencyMs: expect.any(Number),
        details: { target: `127.0.0.1:${stub.port}` },
      });
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    } finally {
      await closeStub(stub);
    }
  });

  it('reports error when the server is unreachable', async () => {
    const stub = await listen(() => undefined);
    await closeStub(stub);

    const indicator = new RedisHealthIndicator(envWith({ redisUrl: `redis://127.0.0.1:${stub.port}/0` }));

    const result = await indicator.check();

    expect(result.status).toBe('error');
    expect(result.message).toBeDefined();
  });
});
