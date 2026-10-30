import { Injectable, Logger } from '@nestjs/common';

import type {
  AuthenticationSecurityLogger,
  LockedOutAttemptLogEntry,
  LockoutTransitionLogEntry,
} from '../../application/ports/authentication-security-logger.port.js';

/**
 * The Nest logger behind the authentication security signals (SEC-002;
 * ADR-015 section 3).
 *
 * Each call emits exactly one structured line — a JSON object rather than prose,
 * so a future metrics layer can consume it without re-parsing a sentence — and
 * the fields are fixed:
 *
 * ```json
 * { "event": "user.locked_out", "userId": "…", "correlationId": "…", "threshold": 5, "durationMs": 900000 }
 * { "event": "user.locked_out_attempt", "userId": "…", "correlationId": "…" }
 * ```
 *
 * Three refusals are deliberate:
 *
 * - **No credential.** The port accepts none, so this adapter cannot log one.
 * - **No remaining time.** The policy window is logged (`durationMs`), the
 *   account's remaining lockout is not: a log that stated it would be a clock an
 *   attacker could read.
 * - **No failure reason beyond the coarse vocabulary.** The audit trail already
 *   records why an attempt failed; this line states the lockout fact only.
 */
@Injectable()
export class NestAuthenticationSecurityLogger implements AuthenticationSecurityLogger {
  private readonly logger = new Logger('AuthenticationSecurity');

  public lockoutTransitioned(entry: LockoutTransitionLogEntry): void {
    this.logger.warn(
      JSON.stringify({
        event: 'user.locked_out',
        userId: entry.userId,
        correlationId: entry.correlationId,
        threshold: entry.threshold,
        durationMs: entry.durationMs,
      }),
    );
  }

  public lockedOutAttempt(entry: LockedOutAttemptLogEntry): void {
    this.logger.warn(
      JSON.stringify({
        event: 'user.locked_out_attempt',
        userId: entry.userId,
        correlationId: entry.correlationId,
      }),
    );
  }
}
