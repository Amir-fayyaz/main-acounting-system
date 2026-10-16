import { Module } from '@nestjs/common';

import { AppConfigService } from '../../../infrastructure/config/app-config.service.js';
import { DatabaseModule, type Database } from '../../../infrastructure/database/database.module.js';
import {
  DATABASE,
  TRANSACTION_BOUNDARY,
} from '../../../infrastructure/database/database.tokens.js';
<<<<<<< HEAD
import type { TransactionBoundary } from '../../../shared/transaction/transaction-boundary.js';
import { AUDIT_RECORDER } from '../../audit/application/audit.tokens.js';
import type { AuditRecorder } from '../../audit/application/ports/audit-recorder.port.js';
=======
import { OutboxModule } from '../../../infrastructure/outbox/outbox.module.js';
import { OUTBOX_RECORDER } from '../../../infrastructure/outbox/outbox.tokens.js';
import type { TransactionBoundary } from '../../../shared/transaction/transaction-boundary.js';
>>>>>>> 8b93ab9 (git init)
import {
  AUTHENTICATION_AUDIT_RECORDER,
  AUTH_SESSION_REPOSITORY,
  CREDENTIAL_REPOSITORY,
  PASSWORD_HASHER,
  SESSION_TOKEN_SERVICE,
} from '../application/authentication.tokens.js';
import type { AuthenticationAuditRecorder } from '../application/ports/authentication-audit-recorder.port.js';
import type { PasswordHasher } from '../application/ports/password-hasher.port.js';
import type { SessionTokenService } from '../application/ports/session-token-service.port.js';
import { GetAuthenticatedSessionUseCase } from '../application/use-cases/get-authenticated-session.use-case.js';
import { SetUserCredentialUseCase } from '../application/use-cases/set-user-credential.use-case.js';
import { SignInUseCase } from '../application/use-cases/sign-in.use-case.js';
import { SignOutUseCase } from '../application/use-cases/sign-out.use-case.js';
<<<<<<< HEAD
import { SignUpUseCase } from '../application/use-cases/sign-up.use-case.js';
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case.js';
=======
>>>>>>> 8b93ab9 (git init)
import { USER_REPOSITORY } from '../application/user.tokens.js';
import type { AuthSessionRepository } from '../domain/repositories/auth-session.repository.js';
import type { CredentialRepository } from '../domain/repositories/credential.repository.js';
import type { UserRepository } from '../domain/repositories/user.repository.js';
import { AuthenticationController } from '../presentation/controllers/authentication.controller.js';
import { CredentialsController } from '../presentation/controllers/credential.controller.js';
import { AuthenticationGuard } from '../presentation/guards/authentication.guard.js';
<<<<<<< HEAD
import { AuditTrailAuthenticationAuditRecorder } from './audit/audit-trail-authentication-audit-recorder.js';
=======
import {
  OutboxAuthenticationAuditRecorder,
  type DomainEventRecorder,
} from './audit/outbox-authentication-audit-recorder.js';
>>>>>>> 8b93ab9 (git init)
import { DrizzleAuthSessionRepository } from './persistence/drizzle-auth-session.repository.js';
import { DrizzleCredentialRepository } from './persistence/drizzle-credential.repository.js';
import { CryptoSessionTokenService } from './security/crypto-session-token-service.js';
import { ScryptPasswordHasher } from './security/scrypt-password-hasher.js';
import { UserModule } from './user.module.js';

/**
 * The Identity module's Authentication feature (IAM-005).
 *
 * It wires the feature's own ports to their adapters and its use cases to the
 * things they depend on:
 *
 * - `CREDENTIAL_REPOSITORY` → `DrizzleCredentialRepository` (the credential
 *   table, inside this module);
 * - `AUTH_SESSION_REPOSITORY` → `DrizzleAuthSessionRepository` (the session
 *   table, inside this module);
 * - `PASSWORD_HASHER` → `ScryptPasswordHasher`, the approved hashing mechanism;
 * - `SESSION_TOKEN_SERVICE` → `CryptoSessionTokenService`, the bearer-token
 *   adapter;
<<<<<<< HEAD
 * - `AUTHENTICATION_AUDIT_RECORDER` → the central **audit contract** (AUD-001),
 *   through the adapter that translates each authentication fact into an audit
 *   entry. Authentication keeps no audit mechanism of its own: it states the
 *   fact, and the Audit capability stores it durably (ADR-003 section 21). The
 *   recorder it delegates to joins the caller's transaction when one is open
 *   and opens its own when it is not, so failed attempts are audited as well as
 *   successful ones;
=======
 * - `AUTHENTICATION_AUDIT_RECORDER` → the shared **outbox** (SHR-006), through
 *   the adapter that opens its own boundary when the caller has none, so failed
 *   attempts are audited as well as successful ones. This is the approved audit
 *   boundary, not a private one;
>>>>>>> 8b93ab9 (git init)
 * - `USER_REPOSITORY` → the user feature's adapter (same module), so sign-in
 *   resolves an existing identity and creating a user is never a side effect of
 *   authenticating;
 * - `TRANSACTION_BOUNDARY` (SHR-005) and the validated configuration (FND-003,
 *   for the session lifetime).
 *
 * Note what is **not** imported: no membership, no role, no permission and no
 * tenant contract. Authentication is independent of all of them by construction,
 * so no wiring mistake can make it read tenant access.
 *
 * `AuthenticationGuard` is exported because it is the authentication context
 * later authorization enforcement consumes: a feature applies the guard and reads
 * the principal it established instead of resolving a token itself.
 */
@Module({
<<<<<<< HEAD
  // `AUDIT_RECORDER` arrives from the global Audit module (AUD-001): this
  // feature records its security facts through that published contract and
  // never touches the audit table, its repository or its read port.
  imports: [DatabaseModule, UserModule],
=======
  imports: [DatabaseModule, OutboxModule, UserModule],
>>>>>>> 8b93ab9 (git init)
  controllers: [AuthenticationController, CredentialsController],
  providers: [
    {
      provide: CREDENTIAL_REPOSITORY,
      useFactory: (database: Database): CredentialRepository =>
        new DrizzleCredentialRepository(database),
      inject: [DATABASE],
    },
    {
      provide: AUTH_SESSION_REPOSITORY,
      useFactory: (database: Database): AuthSessionRepository =>
        new DrizzleAuthSessionRepository(database),
      inject: [DATABASE],
    },
    {
      provide: PASSWORD_HASHER,
      useFactory: (): PasswordHasher => new ScryptPasswordHasher(),
    },
    {
      provide: SESSION_TOKEN_SERVICE,
      useFactory: (): SessionTokenService => new CryptoSessionTokenService(),
    },
    {
<<<<<<< HEAD
      // The central audit boundary: each authentication fact is translated into
      // an audit entry and recorded through the published contract, which joins
      // the caller's transaction when one is open and opens its own when the
      // operation changed nothing (a failed sign-in, a rejected token).
      provide: AUTHENTICATION_AUDIT_RECORDER,
      useFactory: (audit: AuditRecorder): AuthenticationAuditRecorder =>
        new AuditTrailAuthenticationAuditRecorder(audit),
      inject: [AUDIT_RECORDER],
=======
      // The approved audit boundary: the shared outbox, joined when the caller
      // already has a transaction open and opened by the adapter when the
      // operation changed nothing (a failed sign-in, a rejected token).
      provide: AUTHENTICATION_AUDIT_RECORDER,
      useFactory: (
        recorder: DomainEventRecorder,
        boundary: TransactionBoundary,
      ): AuthenticationAuditRecorder => new OutboxAuthenticationAuditRecorder(recorder, boundary),
      inject: [OUTBOX_RECORDER, TRANSACTION_BOUNDARY],
>>>>>>> 8b93ab9 (git init)
    },
    {
      provide: SignInUseCase,
      useFactory: (
        users: UserRepository,
        credentials: CredentialRepository,
        sessions: AuthSessionRepository,
        hasher: PasswordHasher,
        tokens: SessionTokenService,
        audit: AuthenticationAuditRecorder,
        boundary: TransactionBoundary,
        config: AppConfigService,
      ) =>
        new SignInUseCase(
          users,
          credentials,
          sessions,
          hasher,
          tokens,
          audit,
          boundary,
          config.authentication.sessionTtlMinutes,
        ),
      inject: [
        USER_REPOSITORY,
        CREDENTIAL_REPOSITORY,
        AUTH_SESSION_REPOSITORY,
        PASSWORD_HASHER,
        SESSION_TOKEN_SERVICE,
        AUTHENTICATION_AUDIT_RECORDER,
        TRANSACTION_BOUNDARY,
        AppConfigService,
      ],
    },
    {
      provide: SignOutUseCase,
      useFactory: (
        sessions: AuthSessionRepository,
        audit: AuthenticationAuditRecorder,
        boundary: TransactionBoundary,
      ) => new SignOutUseCase(sessions, audit, boundary),
      inject: [AUTH_SESSION_REPOSITORY, AUTHENTICATION_AUDIT_RECORDER, TRANSACTION_BOUNDARY],
    },
    {
      provide: GetAuthenticatedSessionUseCase,
      useFactory: (
        users: UserRepository,
        sessions: AuthSessionRepository,
        tokens: SessionTokenService,
        audit: AuthenticationAuditRecorder,
      ) => new GetAuthenticatedSessionUseCase(users, sessions, tokens, audit),
      inject: [
        USER_REPOSITORY,
        AUTH_SESSION_REPOSITORY,
        SESSION_TOKEN_SERVICE,
        AUTHENTICATION_AUDIT_RECORDER,
      ],
    },
    {
      provide: SetUserCredentialUseCase,
      useFactory: (
        users: UserRepository,
        credentials: CredentialRepository,
        sessions: AuthSessionRepository,
        hasher: PasswordHasher,
        audit: AuthenticationAuditRecorder,
        boundary: TransactionBoundary,
      ) => new SetUserCredentialUseCase(users, credentials, sessions, hasher, audit, boundary),
      inject: [
        USER_REPOSITORY,
        CREDENTIAL_REPOSITORY,
        AUTH_SESSION_REPOSITORY,
        PASSWORD_HASHER,
        AUTHENTICATION_AUDIT_RECORDER,
        TRANSACTION_BOUNDARY,
      ],
    },
<<<<<<< HEAD
    {
      // Registration (IAM-008) composes the two existing boundaries: user
      // creation through the user feature's own use case (exported by
      // UserModule above) and credential establishment through this module's
      // SetUserCredentialUseCase. The three run inside one transaction
      // boundary, so a refused credential or a claimed email leaves no user
      // behind and a registration commits as one consistent fact.
      provide: SignUpUseCase,
      useFactory: (
        createUser: CreateUserUseCase,
        setCredential: SetUserCredentialUseCase,
        boundary: TransactionBoundary,
      ) => new SignUpUseCase(createUser, setCredential, boundary),
      inject: [CreateUserUseCase, SetUserCredentialUseCase, TRANSACTION_BOUNDARY],
    },
=======
>>>>>>> 8b93ab9 (git init)
    AuthenticationGuard,
  ],
  // The authentication boundary is the published contract of this feature: a
  // later authorization feature applies the guard and reads the principal, and
  // never re-resolves a token itself.
  exports: [AuthenticationGuard, GetAuthenticatedSessionUseCase],
})
export class AuthenticationModule {}
