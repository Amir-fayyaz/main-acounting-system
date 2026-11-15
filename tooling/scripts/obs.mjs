#!/usr/bin/env node

/**
 * Local monitoring stack launcher (FND-017).
 *
 *   pnpm obs:up      render the scrape token from .env, then start
 *                    `docker compose --profile observability up -d`
 *   pnpm obs:down    stop the observability services again
 *
 * The stack is strictly opt-in: the plain `docker compose up -d` never starts
 * Prometheus, Grafana or Alertmanager. The token file
 * (infrastructure/observability/runtime/metrics_token) is git-ignored, rendered
 * from METRICS_TOKEN on every start, and never echoed.
 */

import { existsSync, readFileSync } from 'node:fs';
import * as fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseEnvText } from './dev/env.mjs';
import { requireMetricsToken, renderTokenFile, TOKEN_FILE_PATH } from './obs/token-file.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const ENV_PATH = `${ROOT}/.env`;

const command = process.argv[2];

/** Runs a docker compose command in the workspace root. */
function runCompose(args) {
  // Single string on Windows (the shell joins it anyway); passing an args
  // array to a shell-spawned process is deprecated and unescaped.
  return spawnSync(`docker compose ${args}`, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

if (command === 'down') {
  // Explicit service names: a profile-scoped `compose down` also tears down
  // the shared network the infrastructure services use, stopping MySQL/Redis/
  // MinIO with it — never what "stop the monitoring stack" should mean.
  const result = runCompose('--profile observability stop prometheus grafana alertmanager');

  process.exitCode = result.status ?? 1;
} else if (command === 'up') {
  if (!existsSync(ENV_PATH)) {
    console.error(`No .env found at the workspace root. Copy .env.example to .env first.`);
    process.exitCode = 1;
  } else {
    try {
      const variables = parseEnvText(readFileSync(ENV_PATH, 'utf8'));
      const token = requireMetricsToken(variables, ENV_PATH);

      renderTokenFile(fs, `${ROOT}/${TOKEN_FILE_PATH}`, token);
      console.log(`Rendered ${TOKEN_FILE_PATH} (value never echoed).`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  }

  if (process.exitCode === undefined) {
    const result = runCompose('--profile observability up -d');

    process.exitCode = result.status ?? 1;

    if (process.exitCode === 0) {
      console.log('');
      console.log('Observability stack started (all ports bound to 127.0.0.1):');
      console.log('  Prometheus    http://127.0.0.1:9090   (targets, alerts)');
      console.log('  Grafana       http://127.0.0.1:3002   (admin credentials from .env)');
      console.log('  Alertmanager  http://127.0.0.1:9093   (null receiver, delivers nothing)');
      console.log('');
      console.log('Scraping works against the containerised backend (--profile app).');
      console.log('Stop with: pnpm obs:down');
    }
  }
} else {
  console.error('Usage: node tooling/scripts/obs.mjs <up|down>');
  process.exitCode = 1;
}
