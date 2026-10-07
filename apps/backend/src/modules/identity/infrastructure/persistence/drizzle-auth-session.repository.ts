import { and, eq, isNull, sql } from 'drizzle-orm';

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
import { AuthSession } from '../../domain/aggregates/auth-session.js';
import type { AuthSessionRepository } from '../../domain/repositories/auth-session.repository.js';
import type { SessionId } from '../../domain/value-objects/session-id.js';
import type { SessionTokenHash } from '../../domain/value-objects/session-token-hash.js';
import type { UserId } from '../../domain/value-objects/user-id.js';
import { authSessions } from './drizzle-auth-session.schema.js';

type AuthSessionRow = typeof authSessions.$inferSelect;

/**
 * Drizzle/MySQL implementation of the session persistence port (IAM-005;
 * SHR-004, SHR-008).
 *
 * The three properties that matter here are:
 *
 * - **The lookup is by digest, never by token.** `findByTokenHash` compares the
 *   unique `token_hash` column, so a presented credential is reduced to a
 *   one-way value *before* it reaches storage: no query, log or dump can recover
 *   the token, and the lookup is one indexed equality rather than a scan that
 *   handles secrets.
 * - **`update` is one compare-and-swap**, so a sign-out races correctly against a
 *   concurrent credential change that invalidates the same session: the loser is
 *   told the record moved instead of overwriting the winner (SHR-008).
 * - **A bulk invalidation is one statement.** `revokeActiveForUser` marks every
 *   still-usable session of a user in a single `UPDATE`, advancing each row's
 *   revision, so a credential change cannot leave a half-invalidated set behind
 *   or spend one round trip per session. It answers the affected row count, which
 *   is what the audit record states.
 *
 * Every statement goes through `scopedDatabase`, so a session created inside a
 * use case's transaction commits with the audit record beside it and a
 * revocation joins the transaction that caused it; the adapter never opens a
 * transaction of its own (SHR-005).
 *
 * The adapter, the table object and its DDL live in this module's
 * `infrastructure/persistence/` and are exported to no one else (ADR-002
 * sections 8 and 12).
 */
export class DrizzleAuthSessionRepository implements AuthSessionRepository {
  public constructor(private readonly database: Database) {}

  public async get(id: SessionId): Promise<Loaded<AuthSession> | undefined> {
    const rows = await scopedDatabase(this.database)
      .select()
      .from(authSessions)
      .where(eq(authSessions.id, id.value))
      .limit(1);

    return rows[0] === undefined ? undefined : toLoaded(rows[0]);
  }

  public async findByTokenHash(
    tokenHash: SessionTokenHash,
  ): Promise<Loaded<AuthSession> | undefined> {
    const rows = await scopedDatabase(this.database)
      .select()
      .from(authSessions)
      .where(eq(authSessions.tokenHash, tokenHash.value))
      .limit(1);

    return rows[0] === undefined ? undefined : toLoaded(rows[0]);
  }

  public async add(session: AuthSession): Promise<WriteReceipt> {
    try {
      await scopedDatabase(this.database)
        .insert(authSessions)
        .values({
          id: session.id.value,
          userId: session.userId.value,
          tokenHash: session.tokenHash.value,
          expiresAt: session.expiresAt.toDate(),
          revokedAt: session.revokedAt === undefined ? null : session.revokedAt.toDate(),
          revision: Revision.initial().value,
          createdAt: session.createdAt.toDate(),
          updatedAt: session.updatedAt.toDate(),
        });
    } catch (error) {
      // Both keys are unique: a repeated session id, or two sessions answering
      // to one token digest, is a conflict rather than a server error.
      if (isDuplicateKeyError(error)) {
        throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'AuthSessionRepository.add', {
          cause: error,
        });
      }
      throw error;
    }

    return { revision: Revision.initial() };
  }

  public async update(session: AuthSession, expectedRevision: Revision): Promise<WriteReceipt> {
    const [header] = await scopedDatabase(this.database)
      .update(authSessions)
      .set({
        revokedAt: session.revokedAt === undefined ? null : session.revokedAt.toDate(),
        revision: expectedRevision.value + 1,
        updatedAt: session.updatedAt.toDate(),
      })
      .where(
        and(
          eq(authSessions.id, session.id.value),
          eq(authSessions.revision, expectedRevision.value),
        ),
      );

    if (header.affectedRows === 0) {
      throw staleRevisionConflict('AuthSessionRepository.update', expectedRevision);
    }

    return { revision: expectedRevision.next() };
  }

  public async revokeActiveForUser(userId: UserId, now: DateTime): Promise<number> {
    const [header] = await scopedDatabase(this.database)
      .update(authSessions)
      .set({
        revokedAt: now.toDate(),
        updatedAt: now.toDate(),
        // Advanced per row in the database, so a bulk invalidation leaves the
        // same optimistic-concurrency trail a single revocation would.
        revision: sql`${authSessions.revision} + 1`,
      })
      .where(and(eq(authSessions.userId, userId.value), isNull(authSessions.revokedAt)));

    return header.affectedRows;
  }
}

/** Rebuilds the aggregate from a stored row, re-validating every value. */
function toLoaded(row: AuthSessionRow): Loaded<AuthSession> {
  return {
    aggregate: AuthSession.rehydrate({
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: DateTime.from(row.expiresAt),
      revokedAt: row.revokedAt === null ? undefined : DateTime.from(row.revokedAt),
      createdAt: DateTime.from(row.createdAt),
      updatedAt: DateTime.from(row.updatedAt),
    }),
    revision: Revision.of(row.revision),
  };
}

/**
 * Whether a driver reported a duplicate unique key (MySQL `ER_DUP_ENTRY`).
 *
 * The MySQL code lives on the wrapped cause rather than the outermost error, so
 * the cause chain is walked instead of checking only the top level.
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
