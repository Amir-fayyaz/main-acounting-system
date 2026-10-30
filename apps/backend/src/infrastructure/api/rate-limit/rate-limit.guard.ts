/**
 * Rate-limit guard (SEC-001).
 *
 * Reads a per-route `@RateLimit` policy and enforces both per-IP and
 * per-identity limits before the handler runs. The guard is registered on
 * the authentication controller only — it is not global.
 *
 * Fail-closed: when Redis is unavailable, credential-bearing requests are
 * refused with the standard 429 error contract. The refusal reason is logged
 * (redacted) but the subject value (IP, email hash, token digest) is never
 * logged or persisted.
 */
import { CanActivate, ExecutionContext, Inject, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppConfigService } from '../../config/app-config.service.js';
import { ApiErrorException } from '../errors/api-error.exception.js';
import { API_ERROR_CODES } from '../errors/api-error.registry.js';
import { RATE_LIMITER } from './rate-limit.tokens.js';
import { RATE_LIMIT_POLICY_METADATA } from './rate-limit.decorator.js';
import type { RateLimitPolicy } from './rate-limit.decorator.js';
import type { RateLimiter, RateLimitKey } from './rate-limiter.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(RATE_LIMITER) private readonly limiter: RateLimiter,
    private readonly config: AppConfigService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const controller = context.getClass();

    const policy = this.reflector.getAllAndOverride<RateLimitPolicy | undefined>(
      RATE_LIMIT_POLICY_METADATA,
      [handler, controller],
    );

    // No rate-limit policy on this route: nothing to enforce.
    if (policy === undefined) {
      this.logger.warn('RateLimitGuard: no policy found, passing through');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const correlationId = request.correlationId;

    // Resolve the client IP from the connection. Express `request.ip` respects
    // the `trust proxy` setting: when not enabled (as here), it is the direct
    // peer address, so a spoofed `X-Forwarded-For` cannot influence the key.
    const clientIp = request.ip ?? request.socket?.remoteAddress ?? 'unknown';

    // Resolve the identity hint from the request body when the policy declares
    // one. The raw value is never logged or persisted.
    let identityHint: string | undefined;
    if (policy.perIdentity !== undefined) {
      const body = request.body as Record<string, unknown> | undefined;
      const raw = body?.[policy.perIdentity];
      identityHint = typeof raw === 'string' ? raw : undefined;
    }

    const windowMs = this.config.rateLimit.windowMs;
    const now = Date.now();

    // Consume per-IP budget when the policy declares it.
    const ipKey: RateLimitKey = { scope: policy.scope, subject: `ip:${clientIp}` };
    const ipDecision =
      policy.perIp === true
        ? await this.limiter.consume(ipKey, this.config.rateLimit.maxPerIp)
        : undefined;

    // Consume per-identity budget when declared.
    let identityDecision:
      { allowed: boolean; remaining: number; limit: number; resetAtMs: number } | undefined;
    if (identityHint !== undefined) {
      const identityKey: RateLimitKey = {
        scope: policy.scope,
        subject: `identity:${hashSubject(identityHint)}`,
      };
      identityDecision = await this.limiter.consume(
        identityKey,
        this.config.rateLimit.maxPerIdentity,
      );
    }

    // Which bucket refused the request, if any.
    const throttledBy: 'ip' | 'identity' | undefined =
      ipDecision !== undefined && !ipDecision.allowed
        ? 'ip'
        : identityDecision !== undefined && !identityDecision.allowed
          ? 'identity'
          : undefined;

    // Attach rate-limit headers to every response (allowed or throttled), using
    // the most restrictive budget the caller still has.
    const headerDecision = [ipDecision, identityDecision]
      .filter((decision) => decision !== undefined)
      .reduce<{ limit: number; remaining: number; resetAtMs: number } | undefined>(
        (tightest, decision) =>
          tightest === undefined || decision.remaining < tightest.remaining ? decision : tightest,
        undefined,
      );

    if (headerDecision !== undefined) {
      attachRateLimitHeaders(response, headerDecision);
    }

    // Fail closed: any denied decision (including Redis-unavailable) refuses
    // the request with the standard 429 error contract.
    if (throttledBy !== undefined) {
      const decision = throttledBy === 'ip' ? ipDecision! : identityDecision!;

      // Emit a structured log line for the throttled request, without the
      // subject value.
      this.logger.warn(
        JSON.stringify({
          event: 'rate_limited',
          scope: policy.scope,
          subjectType: throttledBy,
          limit: decision.limit,
          windowMs,
          correlationId,
          method: request.method,
          url: request.url,
        }),
      );

      const resetAfterSeconds = Math.max(0, Math.ceil((decision.resetAtMs - now) / 1000));
      response.setHeader('Retry-After', String(resetAfterSeconds));

      throw ApiErrorException.of(API_ERROR_CODES.RATE_LIMITED, {
        message: `Rate limit exceeded for scope "${policy.scope}". Try again later.`,
      });
    }

    return true;
  }
}

/** Hashes a sensitive subject value so it is never stored or logged in plaintext. */
function hashSubject(value: string): string {
  // A stable, non-cryptographic hash is sufficient: the bucket key only needs
  // to be consistent for the same subject and different for different ones.
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return String(hash);
}

/** Attaches standard rate-limit headers to the response. */
function attachRateLimitHeaders(
  response: { setHeader(name: string, value: string): void },
  decision: { limit: number; remaining: number; resetAtMs: number },
): void {
  response.setHeader('X-RateLimit-Limit', String(decision.limit));
  response.setHeader('X-RateLimit-Remaining', String(decision.remaining));
  response.setHeader('X-RateLimit-Reset', String(Math.floor(decision.resetAtMs / 1000)));
}
