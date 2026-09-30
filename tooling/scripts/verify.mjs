#!/usr/bin/env node
/**
 * Baseline development quality gates (FND-005).
 *
 * This script is the single implementation of the required checks. Local
 * development runs it through `pnpm verify`; CI runs the very same command
 * (`.github/workflows/ci.yml`), so the two can never drift apart.
 *
 * Behaviour required by the task:
 *   - runs Typecheck → Lint → Format check → Tests → Build, in that order;
 *   - stops at the first failing check and exits with a non-zero code;
 *   - reports which check failed, the scope it covers (workspace packages are
 *     named by the tool output itself) and the exact command to reproduce it.
 *
 * It intentionally contains no quality rule of its own — every rule lives in
 * tsconfig, eslint.config.mjs, .prettierrc.json and the test runners.
 */

import { spawnSync } from 'node:child_process';
import process from 'node:process';

const STEPS = [
  {
    id: 'typecheck',
    command: 'pnpm typecheck',
    scope: 'pnpm -r typecheck — runs for every workspace package (apps/backend, apps/frontend)',
    fix: 'Fix the reported type errors, then run `pnpm verify` again.',
  },
  {
    id: 'lint',
    command: 'pnpm lint',
    scope: 'eslint . — the whole workspace, including the configuration-boundary rules',
    fix: '`pnpm lint:fix` applies the safe automatic fixes; re-run `pnpm verify`.',
  },
  {
    id: 'format',
    command: 'pnpm format:check',
    scope: 'prettier --check . — every formatted file in the repository',
    fix: '`pnpm format` rewrites the offending files; re-run `pnpm verify`.',
  },
  {
    id: 'test',
    command: 'pnpm test',
    scope:
      'pnpm -r test — Vitest (backend, unit + HTTP) and Jest (frontend); suites are prefixed with their package',
    fix: 'Re-run only the failing suite: `pnpm --filter <package> test`.',
  },
  {
    id: 'build',
    command: 'pnpm build',
    scope:
      'pnpm -r build — backend (nest build) and frontend (next build); output is prefixed with its package',
    fix: 'Re-run only the failing package: `pnpm --filter <package> build`.',
  },
];

const TOTAL = STEPS.length;
const startedAt = Date.now();

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = (seconds % 60).toFixed(0);
  return `${minutes}m ${rest}s`;
}

function banner(title) {
  const line = '='.repeat(72);
  console.log(`\n${line}\n ${title}\n${line}`);
}

function run(step) {
  console.log(`$ ${step.command}`);

  const result = spawnSync(step.command, { stdio: 'inherit', shell: true });

  if (result.error) {
    console.error(`\nCould not start the check: ${result.error.message}`);
    return 1;
  }

  return result.status ?? 1;
}

function reportFailure(step, index, code, durationMs) {
  banner('QUALITY GATE FAILED');

  const lines = [
    ` check     : ${step.id}  (step ${index + 1}/${TOTAL}, exit code ${code}, ${formatDuration(durationMs)})`,
    ` scope     : ${step.scope}`,
    ` reproduce : ${step.command}`,
    ` next      : ${step.fix}`,
    '',
    ' The workspace packages are named in the tool output above',
    ' (for example `apps/backend typecheck: ...` or the failing file path).',
    '='.repeat(72),
  ];

  for (const line of lines) console.error(line);

  if (process.env.GITHUB_ACTIONS === 'true') {
    console.error(
      `::error title=Quality gate failed (${step.id})::Reproduce locally with: ${step.command}`,
    );
  }
}

banner(`Quality gates — ${TOTAL} checks, stops at the first failure`);
console.log(' Run locally with `pnpm verify`; CI runs exactly the same command.');

const results = [];

for (const [index, step] of STEPS.entries()) {
  console.log(`\n[${index + 1}/${TOTAL}] ${step.id}`);

  const stepStartedAt = Date.now();
  const code = run(step);
  const durationMs = Date.now() - stepStartedAt;

  results.push({ step, code, durationMs });

  if (code !== 0) {
    reportFailure(step, index, code, durationMs);
    process.exit(code);
  }

  console.log(` ✓ ${step.id} passed (${formatDuration(durationMs)})`);
}

const totalMs = Date.now() - startedAt;
const line = '-'.repeat(72);
console.log(`\n${line}`);
console.log(` All ${TOTAL} quality gates passed in ${formatDuration(totalMs)}`);
for (const { step, durationMs } of results) {
  console.log(
    `   ${step.id.padEnd(10)} ${formatDuration(durationMs).padStart(8)}  (${step.command})`,
  );
}
console.log(line);
