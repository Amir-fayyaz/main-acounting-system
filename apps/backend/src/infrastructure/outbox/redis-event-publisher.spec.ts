import { describe, expect, it } from 'vitest';

import { AppConfigService } from '../config/app-config.service.js';
import { loadConfiguration } from '../config/configuration.js';
import type { RedisConnectionService } from '../redis/redis-connection.service.js';
import { RedisEventPublisher } from './redis-event-publisher.js';
import type { PublishedEvent } from './event-publisher.port.js';

interface RecordedAdd {
  readonly stream: string;
  readonly id: string;
  readonly fields: Record<string, string>;
  readonly options: unknown;
}

function setup(): {
  publisher: RedisEventPublisher;
  adds: RecordedAdd[];
  ensureCalls: () => number;
  failWith: (error: Error) => void;
} {
  const adds: RecordedAdd[] = [];
  let ensureCalls = 0;
  let failure: Error | undefined;
  const client = {
    xAdd: async (
      stream: string,
      id: string,
      fields: Record<string, string>,
      options: unknown,
    ): Promise<string> => {
      if (failure !== undefined) {
        throw failure;
      }
      adds.push({ stream, id, fields, options });

      return '1-1';
    },
  };
  const connection = {
    ensureConnected: async (): Promise<void> => {
      ensureCalls += 1;
    },
    getClient: () => client,
  } as unknown as RedisConnectionService;
  const config = new AppConfigService(loadConfiguration({ NODE_ENV: 'test' }));

  return {
    publisher: new RedisEventPublisher(connection, config),
    adds,
    ensureCalls: () => ensureCalls,
    failWith: (error: Error) => {
      failure = error;
    },
  };
}

const EVENT: PublishedEvent = {
  eventId: 'msg-1',
  eventType: 'ProbeRecorded',
  eventVersion: 2,
  payload: '{"kind":"event","name":"ProbeRecorded"}',
};

describe('RedisEventPublisher', () => {
  it('appends the envelope to the environment stream with its identity as lookup fields', async () => {
    const { publisher, adds } = setup();

    await publisher.publish(EVENT);

    expect(adds).toHaveLength(1);
    expect(adds[0]?.stream).toBe('events:test:stream');
    expect(adds[0]?.id).toBe('*');
    expect(adds[0]?.fields).toEqual({
      event: EVENT.payload,
      eventId: 'msg-1',
      eventType: 'ProbeRecorded',
    });
  });

  it('bounds the stream length so a silent consumer cannot grow it without limit', async () => {
    const { publisher, adds } = setup();

    await publisher.publish(EVENT);

    expect(adds[0]?.options).toMatchObject({
      TRIM: { strategy: 'MAXLEN', strategyModifier: '~', threshold: 100_000 },
    });
  });

  it('opens the connection on demand rather than at construction', async () => {
    const { publisher, adds, ensureCalls } = setup();

    expect(ensureCalls()).toBe(0);
    expect(adds).toEqual([]);

    await publisher.publish(EVENT);

    expect(ensureCalls()).toBe(1);
  });

  it('surfaces a transport failure to the caller, who settles the record', async () => {
    const { publisher, adds, failWith } = setup();
    failWith(new Error('connection refused'));

    await expect(publisher.publish(EVENT)).rejects.toThrow('connection refused');
    expect(adds).toEqual([]);
  });
});
