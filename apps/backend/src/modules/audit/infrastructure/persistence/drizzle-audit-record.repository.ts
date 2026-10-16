import type { Database } from '../../../../infrastructure/database/database.module.js';
import { scopedDatabase } from '../../../../infrastructure/database/scoped-database.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../../../shared/persistence/persistence-error.js';
import type { WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import type { AuditRecord } from '../../domain/aggregates/audit-record.js';
import type { AuditRecordRepository } from '../../domain/repositories/audit-record.repository.js';
import { toNewAuditRow } from './audit-record.rows.js';
import { auditRecords } from './audit-record.schema.js';

/**
 * Drizzle/MySQL implementation of the audit write port (AUD-001; SHR-004,
 * SHR-005).
 *
 * It is one statement, and that is the whole design:
 *
 * ```ts
 * scopedDatabase(database).insert(auditRecords).values(row)
 * ```
 *
 * - **It joins the caller's transaction when there is one.** Inside a use case's
 *   boundary the record rides the same connection as the state change it
 *   reports, so the two commit together or not at all; with no boundary open —
 *   the failed sign-in, the refused request — it is a single autocommitted
 *   statement of its own. The adapter never opens a transaction, because
 *   participation is the use case's decision (SHR-005).
 * - **It cannot change or remove anything.** There is no update and no delete on
 *   this class, matching the port. The only write is an insert of a record that
 *   does not exist yet.
 *
 * A record whose identity already exists is reported as the shared conflict —
 * `PersistenceError(CONFLICT)` — rather than a driver error a caller would have
 * to interpret: two records sharing one id would mean a fact was written twice,
 * which is a bug worth surfacing precisely, not a retry.
 */
export class DrizzleAuditRecordRepository implements AuditRecordRepository {
  public constructor(private readonly database: Database) {}

  public async add(record: AuditRecord): Promise<WriteReceipt> {
    try {
      await scopedDatabase(this.database).insert(auditRecords).values(toNewAuditRow(record));
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'AuditRecordRepository.add', {
          cause: error,
        });
      }
      throw error;
    }

    return { revision: Revision.initial() };
  }
}

/** Whether a driver reported a duplicate primary key (MySQL `ER_DUP_ENTRY`). */
function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { readonly code?: unknown }).code === 'ER_DUP_ENTRY'
  );
}
