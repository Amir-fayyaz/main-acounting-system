/**
 * Static checks (FND-017) — unit tests for the pure rule functions.
 *
 * These run with no filesystem and no Docker: the rules are exercised over
 * synthetic file contents, covering both the violations they must catch and
 * the legitimate shapes they must not flag (interpolation, file references,
 * comments, localhost-bound ports).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkComposePortBindings, checkFileContent } from './secrets-check.mjs';

describe('checkFileContent', () => {
  it('flags the known dev token value anywhere in a file', () => {
    const violations = checkFileContent(
      'scrape_configs:\n  token: dev-only-change-me-metrics\n',
    );

    // Flagged twice on purpose: once as the known dev default, once as a
    // literal after a token key — either rule alone must catch it.
    assert.equal(violations.length, 2);
    assert.match(violations[0], /dev default value/);
  });

  it('flags literal values after password/token/secret keys', () => {
    for (const line of [
      'password: hunter2',
      'GF_SECURITY_ADMIN_PASSWORD: "s3cret"',
      'bearer_token: abc123',
    ]) {
      const violations = checkFileContent(line);

      assert.equal(violations.length, 1, line);
      assert.match(violations[0], /literal value after "(PASSWORD|password|token)"/);
    }
  });

  it('does not flag interpolation, empty values, file references or comments', () => {
    const content = [
      '# a comment may talk about a password: hunter2 without tripping',
      'GRAFANA_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:?required}',
      'credentials_file: /run/secrets/metrics_token',
      'password: ""',
      'token:',
      'url: http://prometheus:9090',
      'receiver: null-receiver',
    ].join('\n');

    assert.deepEqual(checkFileContent(content), []);
  });
});

describe('checkComposePortBindings', () => {
  it('accepts localhost-bound observability ports and ignores other services', () => {
    const compose = [
      'services:',
      '  mysql:',
      '    profiles: ["default"]',
      '    ports:',
      "      - '3306:3306'",
      '  prometheus:',
      "    profiles: ['observability']",
      '    ports:',
      "      - '127.0.0.1:9090:9090'",
      '  grafana:',
      "    profiles: ['observability']",
      '    ports:',
      "      - '127.0.0.1:3002:3000'",
    ].join('\n');

    assert.deepEqual(checkComposePortBindings(compose), []);
  });

  it('flags any observability port reachable from the network', () => {
    const compose = [
      'services:',
      '  prometheus:',
      "    profiles: ['observability']",
      '    ports:',
      "      - '9090:9090'",
      '  grafana:',
      "    profiles: ['observability']",
      '    ports:',
      "      - '0.0.0.0:3002:3000'",
    ].join('\n');

    const violations = checkComposePortBindings(compose);

    assert.equal(violations.length, 2);
    assert.match(violations[0], /prometheus.*127\.0\.0\.1/);
    assert.match(violations[1], /grafana.*127\.0\.0\.1/);
  });
});
