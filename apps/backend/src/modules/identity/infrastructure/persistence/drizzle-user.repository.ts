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
import { User } from '../../domain/aggregates/user.js';
import type { UserId } from '../../domain/value-objects/user-id.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import { users } from './drizzle-user.schema.js';

type UserRow = typeof users.$inferSelect;

/**
 * Drizzle/MySQL implementation of the user persistence port (IAM-002; SHR-004,
 * SHR-008).
 *
 * Two properties make this adapter correct rather than merely convenient:
 *
 * - **Every statement goes through `scopedDatabase`.** Inside a use case's
 *   transaction the write joins that boundary and commits with it; outside one
 *   it is a single autocommitted statement. The adapter never opens a
 *   transaction of its own (SHR-005).
 * - **`update` is one compare-and-swap.** The revision check and the write are
 *   the same statement, so no other transaction can land between them; zero
 *   affected rows means the record moved, and that is reported through
 *   `staleRevisionConflict` — the shared SHR-008 failure — instead of
 *   overwriting the winner.
 *
 * The adapter, the table object and its DDL live in this module's
 * `infrastructure/persistence/` and are exported to no one else (ADR-002
 * sections 8 and 12; enforced by `src/modules/module-boundaries.spec.ts`).
 */
export class DrizzleUserRepository implements UserRepository {
  public constructor(private readonly database: Database) {}

  public async get(id: UserId): Promise<Loaded<User> | undefined> {
    const rows = await scopedDatabase(this.database)
      .select()
      .from(users)
      .where(eq(users.id, id.value))
      .limit(1);

    const row = rows[0];
    return row === undefined
      ? undefined
      : { aggregate: toUser(row), revision: Revision.of(row.revision) };
  }

  public async add(user: User): Promise<WriteReceipt> {
    try {
      await scopedDatabase(this.database).insert(users).values({
        id: user.id.value,
        displayName: user.displayName.value,
        email: user.email.value,
        status: user.status.value,
        revision: Revision.initial().value,
        createdAt: user.createdAt.toDate(),
        updatedAt: user.updatedAt.toDate(),
      });
    } catch (error) {
      // A duplicate key is a conflict — someone already owns this email or id —
      // not a shape the caller should have to interpret the driver for.
      if (isDuplicateKeyError(error)) {
        throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'UserRepository.add', {
          cause: error,
        });
      }
      throw error;
    }

    return { revision: Revision.initial() };
  }

  public async update(user: User, expectedRevision: Revision): Promise<WriteReceipt> {
    const [header] = await scopedDatabase(this.database)
      .update(users)
      .set({
        displayName: user.displayName.value,
        email: user.email.value,
        status: user.status.value,
        revision: expectedRevision.value + 1,
        updatedAt: user.updatedAt.toDate(),
      })
      .where(and(eq(users.id, user.id.value), eq(users.revision, expectedRevision.value)));

    if (header.affectedRows === 0) {
      // The store answers "nothing matched" without naming what is stored
      // instead, so the cause stays honest about the unknown current revision.
      throw staleRevisionConflict('UserRepository.update', expectedRevision);
    }

    return { revision: expectedRevision.next() };
  }

  public async findByEmail(email: string): Promise<Loaded<User> | undefined> {
    const rows = await scopedDatabase(this.database)
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    const row = rows[0];
    return row === undefined
      ? undefined
      : { aggregate: toUser(row), revision: Revision.of(row.revision) };
  }

  public async existsByEmail(email: string): Promise<boolean> {
    const rows = await scopedDatabase(this.database)
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    return rows.length > 0;
  }

  public async existsById(id: UserId): Promise<boolean> {
    const rows = await scopedDatabase(this.database)
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id.value))
      .limit(1);

    return rows.length > 0;
  }
}

/** Rebuilds the aggregate from a stored row, re-validating every value. */
function toUser(row: UserRow): User {
  return User.rehydrate({
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    status: row.status,
    createdAt: DateTime.from(row.createdAt),
    updatedAt: DateTime.from(row.updatedAt),
  });
}

/**
 * Whether a driver reported a duplicate unique key (MySQL `ER_DUP_ENTRY`).
 *
 * Drizzle wraps the driver failure (`DrizzleQueryError`), and the MySQL code
 * lives on the wrapped cause rather than the outermost error, so the cause
 * chain is walked instead of checking only the top level — otherwise a
 * duplicate email would escape as an unexpected 500 rather than the conflict
 * the caller can act on.
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
