/**
 * Redis-backed rate-limit adapter (SEC-001).
 *
 * Implements `RateLimiter` with a fixed-window counter: each call atomically
 * increments the bucket and returns how much budget remains. The window is
 * set once, on the first increment of the window, so all calls within the
 * same window share one expiry.
 *
 * Keys are namespaced by environment and scope, following the same pattern
 * as `jobKeys` (FND-007). The subject value (an IP, an email hash, a token
 * digest) is never logged.
 *
 * When Redis is unreachable the adapter returns `unavailable: true` instead
 * of throwing: the guard decides fail-closed (credential flows are refused).
 */
import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service.js';
import { RedisConnectionService } from '../../redis/redis-connection.service.js';
import type { RateLimiter, RateLimitKey, RateLimitDecision } from './rate-limiter.js';

/**
 * How long one decision may wait on Redis before it is treated as unavailable.
 *
 * The Redis client retries a refused connection indefinitely
 * (`reconnectStrategy`), so `connect()` does not settle while the server is
 * stopped. Without a bound the guard would wait forever instead of failing
 * closed, which is the opposite of what SEC-001 requires.
 */
const DECISION_TIMEOUT_MS = 1000;

/**
 * Lua script: increment the bucket, set expiry on first hit, return count.
 *
 * The expiry is set in milliseconds (`PEXPIRE`): a whole-second `EXPIRE` would
 * round a sub-second window down to `0`, which deletes the key and silently
 * disables the limit.
 */
const INCR_WITH_EXPIRE_SCRIPT = `
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
  end
  return current
`;

/**
 * Builds a namespaced Redis key for a rate-limit bucket.
 *
 * The environment prefix isolates environments sharing one Redis instance;
 * the scope prefix isolates one rate-limit policy from another; the subject
 * is the hashed identity (IP, email hash, token digest).
 */
function rateLimitKey(environment: string, key: RateLimitKey): string {
  return `rl:${environment}:${key.scope}:${key.subject}`;
}

/** Rejects when `work` has not settled within `timeoutMs`; the timer is always cleared. */
async function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('rate-limit store timed out')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

/** Parses the integer returned by the Lua script (INCR always returns an integer). */
function parseCount(value: unknown): number {
  const count = Number(value);
  return Number.isInteger(count) && count > 0 ? count : 1;
}

/** Computes the reset epoch-ms for a window: the next whole-window boundary after `now`. */
function resetAtMs(now: number, windowMs: number): number {
  return Math.ceil((now + 1) / windowMs) * windowMs;
}

@Injectable()
export class RedisRateLimiter implements RateLimiter {
  private readonly logger = new Logger(RedisRateLimiter.name);

  constructor(
    private readonly connection: RedisConnectionService,
    config: AppConfigService,
  ) {
    this.environment = config.environment.name;
    this.windowMs = config.rateLimit.windowMs;
    this.defaultLimit = config.rateLimit.maxPerIp;
  }

  private readonly environment: string;
  private readonly windowMs: number;
  private readonly defaultLimit: number;

  /**
   * Consumes one unit for `key` and returns the decision.
   *
   * When `limit` is provided it overrides the default per-IP limit for this
   * call, so one adapter can enforce both per-IP and per-identity thresholds.
   *
   * Never throws: when Redis is unavailable the decision carries
   * `unavailable: true` so the guard can fail closed.
   */
  async consume(key: RateLimitKey, limit?: number): Promise<RateLimitDecision> {
    const effectiveLimit = limit ?? this.defaultLimit;
    let current: number;

    try {
      current = await withTimeout(
        (async (): Promise<number> => {
          await this.connection.ensureConnected();
          const result = await this.connection.getClient().eval(INCR_WITH_EXPIRE_SCRIPT, {
            keys: [rateLimitKey(this.environment, key)],
            arguments: [String(this.windowMs)],
          });
          return parseCount(result);
        })(),
        DECISION_TIMEOUT_MS,
      );
    } catch (_error) {
      // Redis is down: fail-safe decision. No subject is logged.
      this.logger.warn('Redis unavailable for rate-limit decision; returning unavailable.');
      return {
        allowed: false,
        remaining: 0,
        limit: effectiveLimit,
        resetAtMs: resetAtMs(Date.now(), this.windowMs),
        unavailable: true,
      };
    }

    const allowed = current <= effectiveLimit;
    const remaining = Math.max(0, effectiveLimit - current);
    return {
      allowed,
      remaining,
      limit: effectiveLimit,
      resetAtMs: resetAtMs(Date.now(), this.windowMs),
    };
  }
}
