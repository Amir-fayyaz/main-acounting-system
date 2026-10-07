import { describe, expect, it } from 'vitest';

import { SignInFailed, UserAuthenticated } from '../../domain/events/authentication.events.js';
import type { DomainEvent } from '../../../../shared/messaging/domain-event.js';
import {
  createTransactionBoundary,
  type TransactionRunner,
} from '../../../../shared/transaction/transaction-boundary.js';
import {
  OutboxAuthenticationAuditRecorder,
  type DomainEventRecorder,
} from './outbox-authentication-audit-recorder.js';

/**
 * The authentication audit adapter (IAM-005).
 *
 * The behaviour that matters is transactional: an authentication fact must
 * commit with the state change it reports, while a *rejected* attempt — which
 * changes nothing — must still be recorded. These tests pin both, over a runner
 * that counts how many transactions were actually opened.
 */

/** The outbox write side, recording what it was handed. */
class RecordingOutbox implements DomainEventRecorder {
  public readonly written: DomainEvent<unknown>[] = [];

  public async record(event: DomainEvent<unknown>): Promise<void> {
    this.written.push(event);
  }
}

/** A runner that counts how many units of work it opened. */
function countingRunner(): { runner: TransactionRunner; runs: () => number } {
  let runs = 0;

  return {
    runner: {
      run: async <T>(work: (transaction: { handle: string }) => Promise<T>): Promise<T> => {
        runs += 1;
        return work({ handle: 'driver-handle' });
      },
    },
    runs: () => runs,
  };
}

describe('OutboxAuthenticationAuditRecorder', () => {
  it('records the fact and opens its own transaction when the caller has none', async () => {
    const outbox = new RecordingOutbox();
    const { runner, runs } = countingRunner();
    const recorder = new OutboxAuthenticationAuditRecorder(outbox, createTransactionBoundary(runner));

    await recorder.record(new SignInFailed({ email: 'nobody@example.com', reason: 'UNKNOWN_CREDENTIAL' }));

    expect(outbox.written.map((event) => event.name)).toEqual(['SignInFailed']);
    expect(runs()).toBe(1);
  });

  it('joins the caller transaction instead of opening a second one', async () => {
    const outbox = new RecordingOutbox();
    const { runner, runs } = countingRunner();
    const boundary = createTransactionBoundary(runner);
    const recorder = new OutboxAuthenticationAuditRecorder(outbox, boundary);

    await boundary.execute(async () => {
      await recorder.record(
        new UserAuthenticated({
          userId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
          sessionId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71',
          expiresAt: '2026-10-03T09:00:00.000Z',
        }),
      );
    });

    // One transaction, one record: the audit row rides the boundary the state
    // change opened, which is what keeps the fact and its audit together.
    expect(runs()).toBe(1);
    expect(outbox.written).toHaveLength(1);
  });

  it('propagates a write failure instead of losing the record silently', async () => {
    const failing: DomainEventRecorder = {
      record: async () => {
        throw new Error('the outbox is unavailable');
      },
    };
    const { runner } = countingRunner();
    const recorder = new OutboxAuthenticationAuditRecorder(failing, createTransactionBoundary(runner));

    await expect(
      recorder.record(new SignInFailed({ email: 'nobody@example.com', reason: 'UNKNOWN_CREDENTIAL' })),
    ).rejects.toThrow('the outbox is unavailable');
  });
});
