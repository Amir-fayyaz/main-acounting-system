#!/usr/bin/env node

/**
 * CI/local runner for the observability static checks (FND-017).
 *
 *   pnpm obs:check
 *
 * Scans every file under infrastructure/observability/ plus docker-compose.yml
 * with the rules in obs/secrets-check.mjs: no committed token or password, and
 * every observability port bound to 127.0.0.1. Exits non-zero on the first
 * violation found, printing the file and reason — never the value.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { checkComposePortBindings, checkFileContent } from './obs/secrets-check.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const OBSERVABILITY_DIR = `${ROOT}/infrastructure/observability`;
const COMPOSE_FILE = `${ROOT}/docker-compose.yml`;

/** Collects every file path under a directory, recursively. */
function listFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);

    if (statSync(full).isDirectory()) {
      files.push(...listFiles(full));
    } else {
      files.push(full);
    }
  }

  return files;
}

let violations = 0;

for (const file of listFiles(OBSERVABILITY_DIR)) {
  // The runtime directory holds the rendered token file; its presence is
  // expected, its contents are a secret by construction, and it is
  // git-ignored — skipped on purpose.
  if (file.includes(`${join('infrastructure', 'observability', 'runtime')}`)) {
    continue;
  }

  for (const violation of checkFileContent(readFileSync(file, 'utf8'))) {
    console.error(`${relative(ROOT, file)}: ${violation}`);
    violations += 1;
  }
}

for (const violation of checkComposePortBindings(readFileSync(COMPOSE_FILE, 'utf8'))) {
  console.error(`docker-compose.yml: ${violation}`);
  violations += 1;
}

if (violations > 0) {
  console.error(`\n${violations} violation(s). Observability files must never contain`);
  console.error('a default password or a literal token, and every port must bind to 127.0.0.1.');
  process.exit(1);
}

console.log('Observability static checks passed: no secrets, all ports on 127.0.0.1.');
