import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { createClient } from 'redis';
import { AppConfigService } from '../config/app-config.service.js';
import { toLogError, type Logger } from '../logging/logger.js';
import { LOGGER } from '../logging/logging.tokens.js';

type RedisClient = ReturnType<typeof createClient>;

const CONNECT_TIMEOUT_MS = 3000;
const MAX_RECONNECT_DELAY_MS = 5000;
const SHUTDOWN_GRACE_MS = 1_000;

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
  private readonly client: RedisClient;
  private pendingConnection?: Promise<void>;
  private shuttingDown = false;

  constructor(
    config: AppConfigService,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {
    const { host, port } = config.redis;

    this.client = createClient({
      url: `redis://${host}:${port}`,
      socket: {
        connectTimeout: CONNECT_TIMEOUT_MS,
        // Once shutdown has begun the retries must stop: a reconnect loop that
        // never yields an Error keeps the connect promise pending forever,
        // which hangs graceful shutdown (the client never becomes "closed").
        reconnectStrategy: (retries) =>
          this.shuttingDown ? false : Math.min(200 * 2 ** retries, MAX_RECONNECT_DELAY_MS),
      },
    });

    // Without a listener, a connection error becomes an unhandled 'error' event and
    // takes the process down. The failure is surfaced through readiness instead,
    // and the log line is redacted by the logger, so a future credential in the
    // URL cannot leak.
    this.client.on('error', (error: Error) => {
      this.logger.warn('Redis connection error', {
        error: toLogError(error),
        detail: { dependency: 'redis' },
      });
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
    this.shuttingDown = true;

    if (!this.client.isOpen) {
      return;
    }

    // `quit()` waits for the server reply; when the client is mid-reconnect
    // (Redis went away earlier) no reply ever comes, so the graceful shutdown
    // must not wait for it either — the force-`destroy()` below closes the
    // socket regardless.
    try {
      await Promise.race([
        this.client.quit(),
        new Promise((resolve) => setTimeout(resolve, SHUTDOWN_GRACE_MS)),
      ]);
    } catch {
      // The connection was already gone; the destroy below is the real close.
    }
    try {
      this.client.destroy();
    } catch {
      // Already destroyed by the quit above.
    }
    this.pendingConnection?.catch(() => {
      // The abort of an in-flight connect must not surface as an unhandled
      // rejection for callers that are no longer listening.
    });
  }
}
