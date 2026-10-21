import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PortConflictError,
  assertInfrastructurePortsAvailable,
  projectHostPortsFromComposePs,
  resolveInfrastructurePorts,
  resolvePort,
} from './ports.mjs';

describe('resolvePort / resolveInfrastructurePorts', () => {
  it('uses compose defaults when nothing overrides them', () => {
    const ports = resolveInfrastructurePorts({});
    assert.deepEqual(
      ports.map(({ variable, port }) => [variable, port]),
      [
        ['MYSQL_PORT', 3306],
        ['REDIS_PORT', 6379],
        ['MINIO_PORT', 9000],
        ['MINIO_CONSOLE_PORT', 9001],
        ['BACKEND_PORT', 3000],
      ],
    );
  });

  it('honours environment overrides and rejects invalid values', () => {
    assert.equal(resolvePort({ MYSQL_PORT: '13306' }, 'MYSQL_PORT'), 13306);
    assert.throws(() => resolvePort({ BACKEND_PORT: 'not-a-number' }, 'BACKEND_PORT'));
    assert.throws(() => resolvePort({ BACKEND_PORT: '70000' }, 'BACKEND_PORT'));
  });
});

describe('projectHostPortsFromComposePs', () => {
  it('reads the JSON-array output shape', () => {
    const text = JSON.stringify([
      { Service: 'mysql', Publishers: [{ PublishedPort: 3306 }] },
      { Service: 'backend', Publishers: [{ PublishedPort: 3000 }] },
    ]);
    assert.deepEqual([...projectHostPortsFromComposePs(text)].sort(), [3000, 3306]);
  });

  it('reads the NDJSON output shape', () => {
    const text =
      '{"Service":"redis","Publishers":[{"PublishedPort":6379}]}\n{"Service":"minio","Publishers":[{"PublishedPort":9000},{"PublishedPort":9001}]}';
    assert.deepEqual([...projectHostPortsFromComposePs(text)].sort(), [6379, 9000, 9001]);
  });

  it('falls back to Ports strings and yields nothing for empty output', () => {
    assert.deepEqual(
      [...projectHostPortsFromComposePs('{"Service":"mysql","Ports":"0.0.0.0:3306->3306/tcp"}')],
      [3306],
    );
    assert.deepEqual([...projectHostPortsFromComposePs('')], []);
  });
});

describe('assertInfrastructurePortsAvailable', () => {
  const ports = [
    { variable: 'MYSQL_PORT', port: 3306 },
    { variable: 'BACKEND_PORT', port: 3000 },
  ];

  it('passes when every port is free', async () => {
    await assertInfrastructurePortsAvailable(ports, {
      isPortInUseFn: async () => false,
      getProjectPorts: async () => new Set(),
    });
  });

  it("passes when a busy port belongs to this project's own Compose stack", async () => {
    await assertInfrastructurePortsAvailable(ports, {
      isPortInUseFn: async () => true,
      getProjectPorts: async () => new Set([3306, 3000]),
    });
  });

  it('fails naming the port and the variable that changes it', async () => {
    const calls = [];
    await assert.rejects(
      assertInfrastructurePortsAvailable(ports, {
        isPortInUseFn: async () => {
          calls.push('busy');
          return true;
        },
        getProjectPorts: async () => new Set(),
      }),
      (error) =>
        error instanceof PortConflictError &&
        error.port === 3306 &&
        error.variable === 'MYSQL_PORT' &&
        error.message.includes('3306') &&
        error.message.includes('MYSQL_PORT'),
    );
  });

  it('checks sequentially and stops at the first conflict', async () => {
    await assert.rejects(
      assertInfrastructurePortsAvailable(ports, {
        isPortInUseFn: async () => true,
        getProjectPorts: async () => new Set(),
      }),
      PortConflictError,
    );
  });
});
