import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import type { AuthenticationAuditRecorder } from '../../src/modules/identity/application/ports/authentication-audit-recorder.port.js';
import type { PasswordHasher } from '../../src/modules/identity/application/ports/password-hasher.port.js';
import {
  Credential,
  type CredentialSnapshot,
} from '../../src/modules/identity/domain/aggregates/credential.js';
import {
  AuthSession,
  type AuthSessionSnapshot,
} from '../../src/modules/identity/domain/aggregates/auth-session.js';
import type { AuthSessionRepository } from '../../src/modules/identity/domain/repositories/auth-session.repository.js';
import type { CredentialRepository } from '../../src/modules/identity/domain/repositories/credential.repository.js';
import type { SessionId } from '../../src/modules/identity/domain/value-objects/session-id.js';
import type { SessionTokenHash } from '../../src/modules/identity/domain/value-objects/session-token-hash.js';
import { PasswordHash } from '../../src/modules/identity/domain/value-objects/password-hash.js';
import type { PlainPassword } from '../../src/modules/identity/domain/value-objects/plain-password.js';
import type { UserId } from '../../src/modules/identity/domain/value-objects/user-id.js';
import type { DomainEvent } from '../../src/shared/messaging/domain-event.js';
import { staleRevisionConflict } from '../../src/shared/persistence/optimistic-concurrency.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../src/shared/persistence/persistence-error.js';
import type { Loaded, WriteReceipt } from '../../src/shared/persistence/repository-ports.js';
import { Revision } from '../../src/shared/persistence/revision.js';
import { DateTime } from '../../src/shared/time/date-time.js';

/**
 * Test doubles for the identity/authentication feature (IAM-005).
 *
 * They implement the module's own ports, never the Drizzle or crypto adapters,
 * so domain and application tests run without a database while still exercising
 * the real use cases and the real shared kernel. The repositories store
 * *snapshots* and hand back rehydrated copies, exactly like the real adapters, so
 * a test cannot accidentally pass because it mutated a shared object.
 *
 * The password hasher below is deliberately **not** a security double: it is a
 * cheap deterministic stand-in so an orchestration test can run many sign-ins
 * without paying for a real key derivation. The approved mechanism is verified
 * by its own spec (`scrypt-password-hasher.spec.ts`) and by the HTTP e2e, which
 * bind the real adapter.
 */

/** In-memory `CredentialRepository` with the shared compare-and-swap semantics. */
export class InMemoryCredentialRepository implements CredentialRepository {
  private readonly records = new Map<
    string,
    { snapshot: CredentialSnapshot; revision: Revision }
  >();

  public addCalls = 0;
  public updateCalls = 0;

  public seed(credential: Credential, revision: Revision = Revision.initial()): void {
    this.records.set(credential.userId.value, { snapshot: credential.snapshot(), revision });
  }

  public revisionOf(userId: UserId): Revision | undefined {
    return this.records.get(userId.value)?.revision;
  }

  /** The stored credential, rehydrated, so a test can assert what actually landed. */
  public stored(userId: UserId): Credential | undefined {
    const record = this.records.get(userId.value);
    return record === undefined ? undefined : Credential.rehydrate(record.snapshot);
  }

  public async get(userId: UserId): Promise<Loaded<Credential> | undefined> {
    const record = this.records.get(userId.value);
    return record === undefined
      ? undefined
      : { aggregate: Credential.rehydrate(record.snapshot), revision: record.revision };
  }

  public async add(credential: Credential): Promise<WriteReceipt> {
    this.addCalls += 1;
    if (this.records.has(credential.userId.value)) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'CredentialRepository.add');
    }
    this.records.set(credential.userId.value, {
      snapshot: credential.snapshot(),
      revision: Revision.initial(),
    });
    return { revision: Revision.initial() };
  }

  public async update(credential: Credential, expectedRevision: Revision): Promise<WriteReceipt> {
    this.updateCalls += 1;
    const record = this.records.get(credential.userId.value);

    if (record === undefined || !record.revision.equals(expectedRevision)) {
      throw staleRevisionConflict('CredentialRepository.update', expectedRevision);
    }

    const next = expectedRevision.next();
    this.records.set(credential.userId.value, { snapshot: credential.snapshot(), revision: next });
    return { revision: next };
  }
}

/** In-memory `AuthSessionRepository`, including the bulk invalidation statement. */
export class InMemoryAuthSessionRepository implements AuthSessionRepository {
  private readonly records = new Map<
    string,
    { snapshot: AuthSessionSnapshot; revision: Revision }
  >();

  public addCalls = 0;
  public updateCalls = 0;

  public seed(session: AuthSession, revision: Revision = Revision.initial()): void {
    this.records.set(session.id.value, { snapshot: session.snapshot(), revision });
  }

  public revisionOf(id: SessionId): Revision | undefined {
    return this.records.get(id.value)?.revision;
  }

  /** The stored session, rehydrated, so a test can assert what actually landed. */
  public stored(id: SessionId): AuthSession | undefined {
    const record = this.records.get(id.value);
    return record === undefined ? undefined : AuthSession.rehydrate(record.snapshot);
  }

  /** Every session that names `userId`, for asserting a bulk invalidation. */
  public sessionsOf(userId: UserId): readonly AuthSession[] {
    return Array.from(this.records.values())
      .filter((record) => record.snapshot.userId === userId.value)
      .map((record) => AuthSession.rehydrate(record.snapshot));
  }

  public async get(id: SessionId): Promise<Loaded<AuthSession> | undefined> {
    const record = this.records.get(id.value);
    return record === undefined
      ? undefined
      : { aggregate: AuthSession.rehydrate(record.snapshot), revision: record.revision };
  }

  public async findByTokenHash(
    tokenHash: SessionTokenHash,
  ): Promise<Loaded<AuthSession> | undefined> {
    const hit = Array.from(this.records.entries()).find(
      ([, record]) => record.snapshot.tokenHash === tokenHash.value,
    );

    return hit === undefined
      ? undefined
      : { aggregate: AuthSession.rehydrate(hit[1].snapshot), revision: hit[1].revision };
  }

  public async add(session: AuthSession): Promise<WriteReceipt> {
    this.addCalls += 1;
    if (this.records.has(session.id.value)) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'AuthSessionRepository.add');
    }
    const duplicateToken = Array.from(this.records.values()).some(
      (record) => record.snapshot.tokenHash === session.tokenHash.value,
    );
    if (duplicateToken) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'AuthSessionRepository.add');
    }
    this.records.set(session.id.value, {
      snapshot: session.snapshot(),
      revision: Revision.initial(),
    });
    return { revision: Revision.initial() };
  }

  public async update(session: AuthSession, expectedRevision: Revision): Promise<WriteReceipt> {
    this.updateCalls += 1;
    const record = this.records.get(session.id.value);

    if (record === undefined || !record.revision.equals(expectedRevision)) {
      throw staleRevisionConflict('AuthSessionRepository.update', expectedRevision);
    }

    const next = expectedRevision.next();
    this.records.set(session.id.value, { snapshot: session.snapshot(), revision: next });
    return { revision: next };
  }

  /**
   * One statement over every not-yet-invalidated session of the user, mirroring
   * the adapter: each affected record is invalidated and its revision advanced,
   * and the count of affected records is returned.
   */
  public async revokeActiveForUser(userId: UserId, now: DateTime): Promise<number> {
    let affected = 0;

    for (const [id, record] of this.records) {
      if (record.snapshot.userId !== userId.value || record.snapshot.revokedAt !== undefined) {
        continue;
      }

      affected += 1;
      this.records.set(id, {
        snapshot: { ...record.snapshot, revokedAt: now, updatedAt: now },
        revision: record.revision.next(),
      });
    }

    return affected;
  }
}

/** Records every audit event a use case raises, in order. */
export class RecordingAuthenticationAudit implements AuthenticationAuditRecorder {
  public readonly recorded: DomainEvent<unknown>[] = [];

  /** Every recorded event's name, for concise assertions. */
  public names(): readonly string[] {
    return this.recorded.map((event) => event.name);
  }

  public async record(event: DomainEvent<unknown>): Promise<void> {
    this.recorded.push(event);
  }
}

/** The algorithm name the orchestration double writes; never the approved one. */
const TEST_ALGORITHM = 'test-sha256';

/**
 * A cheap, deterministic `PasswordHasher` for orchestration tests.
 *
 * **Not a security mechanism.** It uses a single SHA-256 instead of a
 * memory-hard derivation, exists only in `test/support/`, and its algorithm name
 * (`test-sha256`) is one the production adapter refuses to verify — so a test can
 * never accidentally demonstrate a security property with it. What it does share
 * with the real adapter is the *contract*: a self-describing `PasswordHash`, a
 * fresh salt per hash, a constant-time comparison, and a cost-free
 * `verifyWithoutCredential`, so use cases can be tested for behaviour without
 * spending a real key derivation per assertion.
 */
export class FastPasswordHasher implements PasswordHasher {
  public hashCalls = 0;
  public verifyCalls = 0;
  public dummyVerifications = 0;

  public async hash(password: PlainPassword): Promise<PasswordHash> {
    this.hashCalls += 1;
    const salt = randomBytes(16).toString('base64url');

    return PasswordHash.from(
      `${TEST_ALGORITHM}(n=1024,r=8,p=1)$${salt}$${derive(salt, password.reveal())}`,
    );
  }

  public async verify(password: PlainPassword, hash: PasswordHash): Promise<boolean> {
    this.verifyCalls += 1;

    if (hash.algorithm !== TEST_ALGORITHM) {
      return false;
    }

    const expected = Buffer.from(derive(hash.salt, password.reveal()));
    const stored = Buffer.from(hash.derivedKey);

    return expected.length === stored.length && timingSafeEqual(expected, stored);
  }

  public async verifyWithoutCredential(password: PlainPassword): Promise<void> {
    // Counts the call; the secret is deliberately not read.
    void password;
    this.dummyVerifications += 1;
  }
}

function derive(salt: string, password: string): string {
  return createHash('sha256').update(`${salt}:${password}`).digest('base64url');
}
