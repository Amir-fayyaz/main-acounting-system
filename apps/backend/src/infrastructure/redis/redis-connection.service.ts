import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { createClient } from 'redis';
import { AppConfigService } from '../config/app-config.service.js';

type RedisClient = ReturnType<typeof createClient>;

const CONNECT_TIMEOUT_MS = 3000;
const MAX_RECONNECT_DELAY_MS = 5000;

/**
 * Owns the Redis connection for the backend process.
 *
 * The connection is opened on demand instead of at boot: the API process must
 * start (and stay up) when Redis is unavailable, and readiness must be able to
 * report the dependency state. Retrying connect on demand also means a developer
 * can start Redis after the backend and see readiness recover without a restart.
 */
@Injectable()
export class RedisConnectionService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisConnectionService.name);
  private readonly client: RedisClient;
  private pendingConnection?: Promise<void>;

  constructor(config: AppConfigService) {
    const { host, port } = config.redis;

    this.client = createClient({
      url: `redis://${host}:${port}`,
      socket: {
        connectTimeout: CONNECT_TIMEOUT_MS,
        reconnectStrategy: (retries) => Math.min(200 * 2 ** retries, MAX_RECONNECT_DELAY_MS),
      },
    });

    // Without a listener, a connection error becomes an unhandled 'error' event and
    // takes the process down. The failure is surfaced through readiness instead.
    this.client.on('error', (error: Error) => {
      this.logger.warn(`Redis connection error: ${error.message}`);
    });
  }

  getClient(): RedisClient {
    return this.client;
  }

  async ensureConnected(): Promise<void> {
    if (this.client.isReady) {
      return;
    }

    this.pendingConnection ??= this.client
      .connect()
      .then(() => undefined)
      .finally(() => {
        // Cleared on success and on failure, so a later attempt can retry.
        this.pendingConnection = undefined;
      });

    await this.pendingConnection;
  }

  async checkAvailability(): Promise<void> {
    await this.ensureConnected();
    await this.client.ping();
  }

  async onApplicationShutdown(): Promise<void> {
    if (!this.client.isOpen) {
      return;
    }

    await this.client.quit();
  }
}
