#!/usr/bin/env node
/**
 * `pnpm run dev:local` — one-command local development bootstrap (Dev bootstrap).
 *
 * Order is guaranteed and fail-fast (every failure terminates what has already
 * been started and exits non-zero):
 *
 *   1. preflight   — Node/pnpm versions, Docker CLI + daemon, host ports free
 *                    (ports held by this project's own Compose stack are fine)
 *   2. .env        — created from `.env.example` when missing; never overwritten;
 *                    required secret variables validated (names only, no values)
 *   3. infra       — `docker compose up -d --wait mysql redis minio` (health-gated)
 *   4. migrations  — `pnpm --filter @accounting-saas/backend db:migrate`
 *   5. processes   — API (build + run), Worker and Scheduler (watch), each log
 *                    stream prefixed and colored: [api] [worker] [scheduler]
 *   6. ready       — waits for `GET /api/health/ready`, then prints a summary
 *
 * SIGINT/SIGTERM stop all children (and their children) and exit; the Docker
 * services keep running (`pnpm infra:down` / `pnpm dev:reset` stop or reset
 * them). No secret value is ever printed; child output is redacted defensively.
 */

import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { assertRequiredVariables, createEnvFileFromExample, parseEnvText } from './dev/env.mjs';
import {
  assertInfrastructurePortsAvailable,
  isPortInUse,
  projectHostPortsFromComposePs,
  resolveInfrastructurePorts,
  resolvePort,
} from './dev/ports.mjs';
import {
  probeDockerCli,
  probeDockerDaemon,
  probeNodeVersion,
  probePnpmVersion,
  runPreflight,
} from './dev/preflight.mjs';
import { buildReadyUrl, waitForReady } from './dev/health.mjs';
import {
  LineStream,
  prefixLine,
  redactSecrets,
  runCommandSync,
  terminateProcessTree,
} from './dev/processes.mjs';

const REPOSITORY_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const ENV_PATH = `${REPOSITORY_ROOT}/.env`;
const ENV_EXAMPLE_PATH = `${REPOSITORY_ROOT}/.env.example`;
const BACKEND_PACKAGE = '@accounting-saas/backend';
const COMPOSE_SERVICES = ['mysql', 'redis', 'minio'];

const READY_TIMEOUT_MS = Number(process.env.DEV_LOCAL_READY_TIMEOUT_MS ?? 120_000);

// --- Small utilities ---------------------------------------------------------

function log(message) {
  console.log(`[dev] ${message}`);
}

function fail(step, error, children) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n[dev] step "${step}" failed: ${message}`);
  shutdownChildren(children);
  process.exit(1);
}

function stepStart(index, total, id) {
  log(`step ${index}/${total}: ${id}`);
}

function readEnvVariables() {
  if (!existsSync(ENV_PATH)) return {};
  return parseEnvText(readFileSync(ENV_PATH, 'utf8'));
}

// --- Child-process lifecycle -------------------------------------------------

function spawnBackendProcess(label, script, secrets) {
  const child = spawn('pnpm', ['--filter', BACKEND_PACKAGE, script], {
    cwd: REPOSITORY_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true, // resolves the pnpm .cmd/.ps1 wrappers on Windows; args contain no shell syntax
    env: { ...process.env },
  });

  const emit = (stream) => {
    const lineStream = new LineStream((line) =>
      stream(prefixLine(label, redactSecrets(line, secrets))),
    );
    return lineStream;
  };
  const out = emit((line) => console.log(line));
  const err = emit((line) => console.error(line));
  child.stdout.on('data', (chunk) => out.push(chunk));
  child.stderr.on('data', (chunk) => err.push(chunk));
  child.on('close', () => {
    out.flush();
    err.flush();
  });

  log(`[${label}] started (pid ${child.pid}): pnpm --filter ${BACKEND_PACKAGE} ${script}`);
  return child;
}

function shutdownChildren(children) {
  for (const child of children) terminateProcessTree(child);
}

// --- Steps -------------------------------------------------------------------

async function preflightStep(environment) {
  const ports = resolveInfrastructurePorts(environment);
  await runPreflight([
    { id: 'node', run: () => probeNodeVersion() },
    { id: 'pnpm', run: () => probePnpmVersion() },
    { id: 'docker-cli', run: () => probeDockerCli() },
    { id: 'docker-daemon', run: () => probeDockerDaemon() },
    {
      id: 'ports',
      run: async () => {
        await assertInfrastructurePortsAvailable(ports, {
          isPortInUseFn: (port) => isPortInUse(port),
          getProjectPorts: getProjectComposePorts,
        });
      },
    },
  ]);
  for (const port of ports) log(`port ${port.port} ok (${port.variable})`);
}

async function envStep() {
  const { created } = createEnvFileFromExample({
    envPath: ENV_PATH,
    examplePath: ENV_EXAMPLE_PATH,
  });
  log(created ? 'created .env from .env.example' : '.env exists; left untouched');
  const variables = readEnvVariables();
  assertRequiredVariables(variables, { filePath: ENV_PATH });
  return variables;
}

/** Host ports published by this project's own running Compose stack (name: accounting-saas). */
function getProjectComposePorts() {
  try {
    const output = execFileSync('docker', ['compose', 'ps', '--format', 'json'], {
      cwd: REPOSITORY_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: true,
    });
    return projectHostPortsFromComposePs(output);
  } catch {
    return new Set();
  }
}

function infrastructureStep() {
  const { code } = runCommandSync('docker', ['compose', 'up', '-d', '--wait', ...COMPOSE_SERVICES]);
  if (code === 0) return;

  // Name the unhealthy service instead of failing generically.
  let unhealthy = COMPOSE_SERVICES.slice();
  try {
    const output = execFileSync('docker', ['compose', 'ps', '--format', 'json'], {
      cwd: REPOSITORY_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: true,
    });
    const report = parseComposeServices(output);
    const down = report
      .filter((service) => !COMPOSE_SERVICES.includes(service.name))
      .map((service) => service.name);
    const notHealthy = report
      .filter((service) => COMPOSE_SERVICES.includes(service.name) && service.health !== 'healthy')
      .map((service) => service.name);
    unhealthy = [...notHealthy, ...down];
  } catch {
    /* keep the generic list */
  }

  const named = unhealthy.length > 0 ? unhealthy.join(', ') : COMPOSE_SERVICES.join(', ');
  throw new Error(
    `docker compose --wait: the project stack did not become healthy (unhealthy service(s): ${named}). ` +
      `Inspect the logs with: pnpm infra:logs (or: docker compose logs ${named.split(', ')[0]})`,
  );
}

function parseComposeServices(text) {
  const trimmed = String(text).trim();
  if (trimmed === '') return [];
  let entries;
  try {
    const parsed = JSON.parse(trimmed);
    entries = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    entries = trimmed
      .split(/\r?\n/)
      .filter((line) => line !== '')
      .map((line) => JSON.parse(line));
  }
  return entries.map((entry) => ({
    name: entry?.Service ?? entry?.Name ?? '',
    health: entry?.Health ?? entry?.Status ?? '',
  }));
}

// --- Main --------------------------------------------------------------------

async function main() {
  const totalSteps = 6;
  const children = [];
  let shuttingDown = false;

  const onSignal = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(
      `received ${signal}; stopping api, worker and scheduler (Docker services keep running; use "pnpm infra:down" to stop them)`,
    );
    shutdownChildren(children);
    process.exit(0);
  };
  process.on('SIGINT', () => onSignal('SIGINT'));
  process.on('SIGTERM', () => onSignal('SIGTERM'));
  process.on('SIGBREAK', () => onSignal('SIGBREAK'));

  console.log('='.repeat(72));
  log(
    'local development bootstrap — preflight → .env → infrastructure → migrations → api/worker/scheduler',
  );
  console.log('='.repeat(72));

  try {
    stepStart(1, totalSteps, 'preflight');
    await preflightStep(readEnvVariables());

    stepStart(2, totalSteps, '.env');
    const dotenvVariables = await envStep();
    const secrets = [
      'MYSQL_PASSWORD',
      'MYSQL_ROOT_PASSWORD',
      'MINIO_ACCESS_KEY',
      'MINIO_SECRET_KEY',
    ]
      .map((name) => dotenvVariables[name])
      .filter((value) => value !== undefined && value !== '');
    const environment = { ...process.env, ...dotenvVariables };

    stepStart(3, totalSteps, 'infrastructure');
    await infrastructureStep();
    log('infrastructure healthy (mysql, redis, minio)');

    stepStart(4, totalSteps, 'migrations');
    {
      const { code } = runCommandSync('pnpm', ['--filter', BACKEND_PACKAGE, 'db:migrate']);
      if (code !== 0) {
        throw new Error(
          'the migration step failed (non-zero exit); no backend process was started. ' +
            'Fix the error above and run `pnpm run dev:local` again.',
        );
      }
    }

    stepStart(5, totalSteps, 'processes');
    const childByLabel = {
      api: spawnBackendProcess('api', 'dev', secrets), // `dev` builds, then runs the compiled API (no watch)
      worker: spawnBackendProcess('worker', 'dev:worker', secrets),
      scheduler: spawnBackendProcess('scheduler', 'dev:scheduler', secrets),
    };
    children.push(...Object.values(childByLabel));

    for (const [label, child] of Object.entries(childByLabel)) {
      child.on('exit', (code, signal) => {
        if (shuttingDown) return;
        shuttingDown = true;
        const why = signal !== null ? `signal ${signal}` : `exit code ${code}`;
        console.error(
          `\n[dev] the [${label}] process exited (${why}); shutting the other processes down.`,
        );
        shutdownChildren(children.filter((other) => other !== child));
        process.exit(1);
      });
    }

    stepStart(6, totalSteps, 'ready');
    const backendPort = resolvePort(environment, 'BACKEND_PORT');
    const readyUrl = buildReadyUrl({ port: backendPort, prefix: environment.BACKEND_API_PREFIX });
    await waitForReady(readyUrl, { timeoutMs: READY_TIMEOUT_MS });

    const minioPort = resolvePort(environment, 'MINIO_CONSOLE_PORT');
    console.log('');
    console.log('='.repeat(72));
    log('ready — the local stack is up:');
    console.log(
      `        api        : ${readyUrl.replace(/\/health\/ready$/, '')}  (readiness: ${readyUrl})`,
    );
    console.log(`        minio console: http://localhost:${minioPort}`);
    console.log('        worker     : consuming the job queue (logs prefixed [worker])');
    console.log('        scheduler  : enqueueing periodic work   (logs prefixed [scheduler])');
    console.log(
      '        stop       : Ctrl+C (Docker services keep running; `pnpm dev:reset` resets data)',
    );
    console.log('='.repeat(72));
  } catch (error) {
    fail(error?.stepId ?? 'startup', error, children);
  }

  await new Promise(() => {
    /* keep the processes running until a signal or a crash ends them */
  });
}

main();
