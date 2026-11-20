import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { AppConfigService } from '../../config/app-config.service.js';

/**
 * The bearer boundary of `GET /api/metrics` (FND-016).
 *
 * The scrape endpoint discloses route names and traffic patterns, so the
 * deny-by-default rule of ADR-010 applies: **every** request needs a valid
 * `METRICS_TOKEN` bearer credential, including local scrapes. (Production
 * additionally refuses to boot without one — that check lives in the
 * configuration validation, so a misconfigured deployment never starts.)
 *
 * The comparison is constant-time: both values are hashed first (which also
 * equalizes their lengths), then compared with `timingSafeEqual`, so a
 * timing side channel cannot recover the token a byte at a time.
 *
 * The token never appears in an error message, a response body or a log line;
 * the failure reason is the generic 401 of the standard error contract.
 */
@Injectable()
export class MetricsTokenGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();

    const presented = this.bearerToken(request.headers['authorization']);

    if (presented === undefined || !safeEquals(presented, this.config.metrics.token ?? '')) {
      throw new UnauthorizedException('Missing or invalid metrics bearer token');
    }

    return true;
  }

  /** The credential of a `Bearer <token>` header, or `undefined` when absent. */
  private bearerToken(header: string | string[] | undefined): string | undefined {
    const value = Array.isArray(header) ? header[0] : header;

    if (value === undefined) {
      return undefined;
    }

    const match = /^Bearer (.+)$/i.exec(value.trim());

    return match?.[1];
  }
}

/** Length-safe constant-time comparison of two strings. */
function safeEquals(presented: string, expected: string): boolean {
  // Hashing both sides makes the inputs fixed-length (32 bytes for SHA-256),
  // which `timingSafeEqual` requires, without short-circuiting on length.
  const presentedHash = createHash('sha256').update(presented).digest();
  const expectedHash = createHash('sha256').update(expected).digest();

  return timingSafeEqual(presentedHash, expectedHash);
}
