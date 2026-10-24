import { Global, Module } from '@nestjs/common';

import { DatabaseModule, type Database } from '../../../infrastructure/database/database.module.js';
import {
  DATABASE,
  TRANSACTION_BOUNDARY,
} from '../../../infrastructure/database/database.tokens.js';
import type { TransactionBoundary } from '../../../shared/transaction/transaction-boundary.js';
import {
  AUDIT_RECORDER,
  AUDIT_RECORD_QUERY,
  AUDIT_RECORD_REPOSITORY,
} from '../application/audit.tokens.js';
import type { AuditRecorder } from '../application/ports/audit-recorder.port.js';
import type { AuditRecordQuery } from '../application/ports/audit-record-query.port.js';
import { ListTenantAuditRecordsUseCase } from '../application/use-cases/list-tenant-audit-records.use-case.js';
import { RecordAuditEntryUseCase } from '../application/use-cases/record-audit-entry.use-case.js';
import type { AuditRecordRepository } from '../domain/repositories/audit-record.repository.js';
import { AuditRecordsController } from '../presentation/controllers/audit-record.controller.js';
import { DrizzleAuditRecordQuery } from './persistence/drizzle-audit-record-query.js';
import { DrizzleAuditRecordRepository } from './persistence/drizzle-audit-record.repository.js';

/**
 * The central Audit capability (AUD-001; ADR-003 section 21; ADR-010 section 9).
 *
 * It wires the module's own ports to their adapters, and publishes exactly one
 * thing:
 *
 * - `AUDIT_RECORDER` → `RecordAuditEntryUseCase`, the implementation of the
 *   published application contract (`application/ports/audit-recorder.port.ts`).
 *   Every module records facts through this token and never sees the record, the
 *   table, the repository or the read port. It is the
 *   `Business Module → Audit Contract → Audit Module` boundary of ADR-003,
 *   section 21, and it is what makes centralizing audit real rather than a
 *   convention.
 * - `AUDIT_RECORD_REPOSITORY` → the Drizzle adapter for this module's table,
 *   private to the module: the only write path is the contract above.
 * - `AUDIT_RECORD_QUERY` → the Drizzle read adapter, private as well; the trail
 *   is read through the retrieval use case, which is authorization-protected at
 *   the boundary that exposes it.
 * - `ListTenantAuditRecordsUseCase` → the retrieval use case behind the audit
 *   REST resource.
 *
 * The module is `@Global` for the same reason the tenant module is: a consumer
 * inside `src/modules/` may not import another module's `infrastructure/`
 * (including this file), so the published contract is made available
 * application-wide instead — and nothing else becomes visible, because only
 * `AUDIT_RECORDER` is exported.
 */
@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [AuditRecordsController],
  providers: [
    {
      provide: AUDIT_RECORD_REPOSITORY,
      useFactory: (database: Database): AuditRecordRepository =>
        new DrizzleAuditRecordRepository(database),
      inject: [DATABASE],
    },
    {
      provide: AUDIT_RECORD_QUERY,
      useFactory: (database: Database): AuditRecordQuery => new DrizzleAuditRecordQuery(database),
      inject: [DATABASE],
    },
    {
      // The published contract. Its implementation decides the two things a
      // consuming module must not decide for itself: which tenant a fact belongs
      // to (the ambient scope, never a parameter) and which transaction it
      // commits with (the caller's, when one is open).
      provide: AUDIT_RECORDER,
      useFactory: (records: AuditRecordRepository, boundary: TransactionBoundary): AuditRecorder =>
        new RecordAuditEntryUseCase(records, boundary),
      inject: [AUDIT_RECORD_REPOSITORY, TRANSACTION_BOUNDARY],
    },
    {
      provide: ListTenantAuditRecordsUseCase,
      useFactory: (records: AuditRecordQuery) => new ListTenantAuditRecordsUseCase(records),
      inject: [AUDIT_RECORD_QUERY],
    },
  ],
  exports: [AUDIT_RECORDER],
})
export class AuditModule {}
