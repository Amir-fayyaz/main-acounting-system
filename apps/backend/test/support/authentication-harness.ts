import { randomUUID } from 'node:crypto';

import { GetAuthenticatedSessionUseCase } from '../../src/modules/identity/application/use-cases/get-authenticated-session.use-case.js';
import { SetUserCredentialUseCase } from '../../src/modules/identity/application/use-cases/set-user-credential.use-case.js';
import { SignInUseCase } from '../../src/modules/identity/application/use-cases/sign-in.use-case.js';
import { SignOutUseCase } from '../../src/modules/identity/application/use-cases/sign-out.use-case.js';
import { AuthSession } from '../../src/modules/identity/domain/aggregates/auth-session.js';
import { Credential } from '../../src/modules/identity/domain/aggregates/credential.js';
import type { User } from '../../src/modules/identity/domain/aggregates/user.js';
import { PlainPassword } from '../../src/modules/identity/domain/value-objects/plain-password.js';
import { CryptoSessionTokenService } from '../../src/modules/identity/infrastructure/security/crypto-session-token-service.js';
import { DateTime } from '../../src/shared/time/date-time.js';
import {
  FastPasswordHasher,
  InMemoryAuthSessionRepository,
  InMemoryCredentialRepository,
  RecordingAuthenticationAudit,
} from './authentication-doubles.js';
import { InMemoryUserRepository, PassthroughTransactionBoundary, aUser } from './user-doubles.js';

/**
 * The shared harness for the authentication use-case specs (IAM-005).
 *
 * It builds the four use cases over in-memory repositories and a recording audit
 * boundary, with the **real** token adapter (so a test can assert the stored
 * digest really is the digest of the token the client was handed) and the fast
 * orchestration password hasher (the real mechanism has its own spec). Both
 * `sign-in` and session/sign-out specs use it, so the wiring is exercised
 * consistently instead of being restated per file.
 */

/** The default password every seeded user is given. */
export const TEST_PASSWORD = 'correct horse battery staple';

export interface AuthenticationHarness {
  readonly users: InMemoryUserRepository;
  readonly credentials: InMemoryCredentialRepository;
  readonly sessions: InMemoryAuthSessionRepository;
  readonly hasher: FastPasswordHasher;
  readonly tokens: CryptoSessionTokenService;
  readonly audit: RecordingAuthenticationAudit;
  readonly boundary: PassthroughTransactionBoundary;
  readonly signIn: SignInUseCase;
  readonly signOut: SignOutUseCase;
  readonly getAuthenticatedSession: GetAuthenticatedSessionUseCase;
  readonly setCredential: SetUserCredentialUseCase;
}

/** Builds the harness; `sessionTtlMinutes` is the configured session lifetime. */
export function createAuthenticationHarness(sessionTtlMinutes = 60): AuthenticationHarness {
  const users = new InMemoryUserRepository();
  const credentials = new InMemoryCredentialRepository();
  const sessions = new InMemoryAuthSessionRepository();
  const hasher = new FastPasswordHasher();
  const tokens = new CryptoSessionTokenService();
  const audit = new RecordingAuthenticationAudit();
  const boundary = new PassthroughTransactionBoundary();

  return {
    users,
    credentials,
    sessions,
    hasher,
    tokens,
    audit,
    boundary,
    signIn: new SignInUseCase(
      users,
      credentials,
      sessions,
      hasher,
      tokens,
      audit,
      boundary,
      sessionTtlMinutes,
    ),
    signOut: new SignOutUseCase(sessions, audit, boundary),
    getAuthenticatedSession: new GetAuthenticatedSessionUseCase(users, sessions, tokens, audit),
    setCredential: new SetUserCredentialUseCase(
      users,
      credentials,
      sessions,
      hasher,
      audit,
      boundary,
    ),
  };
}

/** Seeds a user, active unless `status: 'inactive'` is asked for. */
export async function seedUser(
  app: AuthenticationHarness,
  options: { displayName?: string; email?: string; status?: 'active' | 'inactive' } = {},
): Promise<User> {
  const user = aUser(
    options.displayName ?? 'Ali Rezaei',
    options.email ?? `ali.${randomUUID()}@example.com`,
  );

  if (options.status === 'inactive') {
    user.deactivate(user.createdAt);
  }

  app.users.seed(user);
  return user;
}

/** Establishes and stores a credential for `user`, the way provisioning does. */
export async function seedCredential(
  app: AuthenticationHarness,
  user: User,
  password = TEST_PASSWORD,
): Promise<Credential> {
  const credential = Credential.create({
    userId: user.id,
    passwordHash: await app.hasher.hash(PlainPassword.from(password)),
    now: DateTime.now(),
  });

  app.credentials.seed(credential);
  return credential;
}

/**
 * Seeds an authenticated session for `user` and answers the raw token.
 *
 * A session whose lifetime has already ended is modelled the way storage sees
 * it: it is created with a valid lifetime and then read back with an earlier
 * expiry, because the aggregate deliberately refuses to create a session that
 * was never usable. That is also the only honest way for a test to produce the
 * "expired session" state.
 */
export function seedSession(
  app: AuthenticationHarness,
  user: User,
  options: { expiresAt?: DateTime; revoked?: boolean } = {},
): { session: AuthSession; token: string } {
  const now = DateTime.now();
  const token = `seeded-token-${randomUUID()}`;
  const expiresAt = options.expiresAt ?? DateTime.fromEpochMillis(now.epochMillis + 3_600_000);
  const created = AuthSession.create({
    userId: user.id,
    tokenHash: app.tokens.hash(token),
    expiresAt: expiresAt.isAfter(now)
      ? expiresAt
      : DateTime.fromEpochMillis(now.epochMillis + 1_000),
    now,
  });
  const session = expiresAt.isAfter(now)
    ? created
    : AuthSession.rehydrate({ ...created.snapshot(), expiresAt });

  if (options.revoked === true) {
    session.revoke(now);
  }

  app.sessions.seed(session);
  return { session, token };
}
