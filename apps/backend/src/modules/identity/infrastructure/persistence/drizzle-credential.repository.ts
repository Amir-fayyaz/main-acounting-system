import { and, eq } from 'drizzle-orm';

import type { Database } from '../../../../infrastructure/database/database.module.js';
import { scopedDatabase } from '../../../../infrastructure/database/scoped-database.js';
import { staleRevisionConflict } from '../../../../shared/persistence/optimistic-concurrency.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../../../shared/persistence/persistence-error.js';
import type { Loaded, WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { Credential } from '../../domain/aggregates/credential.js';
import type { CredentialRepository } from '../../domain/repositories/credential.repository.js';
import type { UserId } from '../../domain/value-objects/user-id.js';
import { userCredentials } from './drizzle-credential.schema.js';

type CredentialRow = typeof userCredentials.$inferSelect;

/**
 * Drizzle/MySQL implementation of the credential persistence port (IAM-005;
 * SHR-004, SHR-008).
 *
 * Two properties make this adapter correct rather than merely convenient:
 *
 * - **Every statement goes through `scopedDatabase`.** A credential written
 *   inside a use case's transaction commits with the audit record and the
 *   session invalidation beside it; outside one it is a single autocommitted
 *   statement. The adapter never opens a transaction of its own (SHR-005).
 * - **`update` is one compare-and-swap.** A rotation checks the revision in the
 *   same statement that writes, so a concurrent rotation cannot silently win:
 *   zero affected rows means the record moved and is reported through
 *   `staleRevisionConflict`, the shared SHR-008 failure.
 *
 * The adapter stores the *encoded* hash the domain validated, so what is written
 * is byte-for-byte what a verifier will read back, and nothing here can produce
 * a credential the domain could not parse. The `user_id` primary key turns the
 * one-credential-per-user rule into a database constraint: a lost creation race
 * fails the insert and is reported as the shared `CONFLICT` rather than
 * overwriting the credential that won.
 *
 * The adapter, the table object and its DDL live in this module's
 * `infrastructure/persistence/` and are exported to no one else (ADR-002
 * sections 8 and 12).
 */
export class DrizzleCredentialRepository implements CredentialRepository {
  public constructor(private readonly database: Database) {}

  public async get(id: UserId): Promise<Loaded<Credential> | undefined> {
    const rows = await scopedDatabase(this.database)
      .select()
      .from(userCredentials)
      .where(eq(userCredentials.userId, id.value))
      .limit(1);

    const row = rows[0];
    return row === undefined
      ? undefined
      : { aggregate: toCredential(row), revision: Revision.of(row.revision) };
  }

  public async add(credential: Credential): Promise<WriteReceipt> {
    try {
      await scopedDatabase(this.database).insert(userCredentials).values({
        userId: credential.userId.value,
        passwordHash: credential.passwordHash.encoded,
        revision: Revision.initial().value,
        createdAt: credential.createdAt.toDate(),
        updatedAt: credential.updatedAt.toDate(),
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'CredentialRepository.add', {
          cause: error,
        });
      }
      throw error;
    }

    return { revision: Revision.initial() };
  }

  public async update(credential: Credential, expectedRevision: Revision): Promise<WriteReceipt> {
    const [header] = await scopedDatabase(this.database)
      .update(userCredentials)
      .set({
        passwordHash: credential.passwordHash.encoded,
        revision: expectedRevision.value + 1,
        updatedAt: credential.updatedAt.toDate(),
      })
      .where(
        and(
          eq(userCredentials.userId, credential.userId.value),
          eq(userCredentials.revision, expectedRevision.value),
        ),
      );

    if (header.affectedRows === 0) {
      // The store answers "nothing matched" without naming what is stored
      // instead, so the cause stays honest about the unknown current revision.
      throw staleRevisionConflict('CredentialRepository.update', expectedRevision);
    }

    return { revision: expectedRevision.next() };
  }
}

/** Rebuilds the aggregate from a stored row, re-validating the encoded hash. */
function toCredential(row: CredentialRow): Credential {
  return Credential.rehydrate({
    userId: row.userId,
    passwordHash: row.passwordHash,
    createdAt: DateTime.from(row.createdAt),
    updatedAt: DateTime.from(row.updatedAt),
  });
}

/**
 * Whether a driver reported a duplicate primary key (MySQL `ER_DUP_ENTRY`).
 *
 * Drizzle wraps the driver failure, and the MySQL code lives on the wrapped
 * cause rather than the outermost error, so the cause chain is walked instead of
 * checking only the top level — otherwise a lost creation race would escape as
 * an unexpected 500 rather than a conflict the caller can act on.
 */
function isDuplicateKeyError(error: unknown): boolean {
  let current: unknown = error;

  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth += 1) {
    if ((current as { readonly code?: unknown }).code === 'ER_DUP_ENTRY') {
      return true;
    }
    current = (current as { readonly cause?: unknown }).cause;
  }

  return false;
}
