import { describe, expect, it } from 'vitest';

import { ActorScope } from '../../../../shared/actor/actor-scope.js';
import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import type { WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { InMemoryAuditRecordRepository } from '../../../../../test/support/audit-doubles.js';
import type { AuditRecordRepository } from '../../domain/repositories/audit-record.repository.js';
import { AUDIT_REDACTION_MARKER } from '../../domain/value-objects/audit-metadata.js';
import { RecordAuditEntryUseCase } from './record-audit-entry.use-case.js';

/**
 * The audit write path (AUD-001).
 *
 * It pins the four facts the acceptance criteria make security claims about:
 * the tenant comes from the ambient scope (never from the entry), the actor is
 * either explicit or the ambient principal (and otherwise the system), a
 * context's secrets never survive sanitization, and the write runs inside the
 * transaction boundary so it joins the caller's open transaction.
 */

const TENANT = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const ACTOR = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71';

/** A boundary that runs the work inline and counts how many boundaries opened. */
class CountingBoundary implements TransactionBoundary {
  public runs = 0;

  public async execute<T>(work: () => Promise<T>): Promise<T> {
    this.runs += 1;
    return work();
  }
}

function build(): {
  records: InMemoryAuditRecordRepository;
  boundary: CountingBoundary;
  useCase: RecordAuditEntryUseCase;
} {
  const records = new InMemoryAuditRecordRepository();
  const boundary = new CountingBoundary();

  return { records, boundary, useCase: new RecordAuditEntryUseCase(records, boundary) };
}

describe('RecordAuditEntryUseCase — actor and tenant resolution', () => {
  it('records a system-generated fact with no actor and no tenant', async () => {
    const { records, useCase } = build();

    await useCase.record({ action: 'audit.record_created', outcome: 'success' });

    const [record] = records.stored();
    expect(record.action.value).toBe('audit.record_created');
    expect(record.outcome.value).toBe('success');
    expect(record.actor.isSystem()).toBe(true);
    expect(record.actor.userId).toBeUndefined();
    expect(record.tenantId).toBeUndefined();
  });

  it('captures the ambient authenticated actor when the entry states none', async () => {
    const { records, useCase } = build();

    await ActorScope.run(ACTOR, () =>
      useCase.record({ action: 'role.permission_granted', outcome: 'success' }),
    );

    const [record] = records.stored();
    expect(record.actor.isUser()).toBe(true);
    expect(record.actor.userId).toBe(ACTOR);
  });

  it('lets an explicit actor win over the ambient scope', async () => {
    const { records, useCase } = build();

    await ActorScope.run(ACTOR, () =>
      useCase.record({
        action: 'role.permission_granted',
        outcome: 'success',
        actorUserId: 'explicit-actor',
      }),
    );

    expect(records.stored()[0]?.actor.userId).toBe('explicit-actor');
  });

  it('stamps the resolved tenant scope, and never a tenant from the entry', async () => {
    const { records, useCase } = build();

    await TenantScope.run(createTenantContext(TENANT), () =>
      useCase.record({ action: 'user.signed_in', outcome: 'success', actorUserId: ACTOR }),
    );

    expect(records.stored()[0]?.tenantId).toBe(TENANT);
  });
});

describe('RecordAuditEntryUseCase — sanitization and transaction', () => {
  it('sanitizes credential material before the record exists', async () => {
    const { records, useCase } = build();

    await useCase.record({
      action: 'user.signed_in',
      outcome: 'success',
      actorUserId: ACTOR,
      metadata: {
        sessionId: 'session-1',
        password: 's3cret',
        nested: { refreshToken: 'also-secret' },
      },
    });

    expect(records.stored()[0]?.metadata).toEqual({
      sessionId: 'session-1',
      password: AUDIT_REDACTION_MARKER,
      nested: { refreshToken: AUDIT_REDACTION_MARKER },
    });
  });

  it('writes inside the transaction boundary', async () => {
    const { records, boundary, useCase } = build();

    await useCase.record({ action: 'audit.record_created', outcome: 'success' });

    expect(boundary.runs).toBe(1);
    expect(records.addCalls).toBe(1);
  });

  it('propagates a write failure instead of losing the record silently', async () => {
    const useCase = new RecordAuditEntryUseCase(
      new FailingAuditRecordRepository(),
      new CountingBoundary(),
    );

    await expect(
      useCase.record({ action: 'audit.record_created', outcome: 'success' }),
    ).rejects.toThrow('the store is unavailable');
  });
});

/** A write port whose store is unavailable, to prove a failure is not swallowed. */
class FailingAuditRecordRepository implements AuditRecordRepository {
  public async add(): Promise<WriteReceipt> {
    throw new Error('the store is unavailable');
  }
}
