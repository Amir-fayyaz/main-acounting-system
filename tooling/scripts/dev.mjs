#!/usr/bin/env node

/**
 * Local development launcher.
 *
 * Run: pnpm run dev:local
 * Ctrl+C stops application processes. Docker services remain running.
 * Only application ports are cleaned up; infrastructure ports are never killed.
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const ENV_PATH = `${ROOT}/.env`;
const ENV_EXAMPLE_PATH = `${ROOT}/.env.example`;

const BACKEND_PACKAGE = '@accounting-saas/backend';
const COMPOSE_SERVICES = ['mysql', 'redis', 'minio'];
const TOTAL_STEPS = 8;
const READY_TIMEOUT_MS = Number(process.env.DEV_LOCAL_READY_TIMEOUT_MS ?? 120_000);

const FRONTENDS = [
  { label: 'FRONTEND', packageName: 'frontend', port: 3001 },
  { label: 'ADMIN', packageName: 'web-admin', port: 3002 },
  { label: 'BUSINESS', packageName: 'web-business', port: 3003 },
];

const REQUIRED_SECRET_NAMES = [
  'MYSQL_PASSWORD',
  'MYSQL_ROOT_PASSWORD',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
];

// -----------------------------------------------------------------------------
// Colorful logging
// -----------------------------------------------------------------------------

const COLOR_ENABLED =
  process.stdout.isTTY === true &&
  process.env.NO_COLOR === undefined &&
  process.env.FORCE_COLOR !== '0';

const ansi = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
};

function paint(value, ...styles) {
  const text = String(value);
  return COLOR_ENABLED ? `${styles.join('')}${text}${ansi.reset}` : text;
}

function log(message) {
  console.log(`${paint('◆', ansi.cyan, ansi.bold)} ${message}`);
}

function success(message) {
  console.log(`${paint('✔', ansi.green, ansi.bold)} ${message}`);
}

function warn(message) {
  console.warn(`${paint('⚠', ansi.yellow, ansi.bold)} ${message}`);
}

function errorLog(message) {
  console.error(`${paint('✖', ansi.red, ansi.bold)} ${message}`);
}

function step(number, message) {
  const counter = `${number}/${TOTAL_STEPS}`;
  console.log('');
  console.log(
    `${paint(`━━ ${counter} ━━`, ansi.blue, ansi.bold)} ${paint(message, ansi.white, ansi.bold)}`,
  );
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function printBanner() {
  console.log('');
  console.log(
    paint('╔══════════════════════════════════════════════════════════════╗', ansi.cyan, ansi.bold),
  );
  console.log(
    `${paint('║', ansi.cyan, ansi.bold)}${paint('             ACCOUNTING SAAS · LOCAL DEVELOPMENT             ', ansi.white, ansi.bold)}${paint('║', ansi.cyan, ansi.bold)}`,
  );
  console.log(
    paint('╚══════════════════════════════════════════════════════════════╝', ansi.cyan, ansi.bold),
  );
}

// -----------------------------------------------------------------------------
// Environment
// -----------------------------------------------------------------------------

function readEnv() {
  if (!existsSync(ENV_PATH)) return {};
  return parseEnvText(readFileSync(ENV_PATH, 'utf8'));
}
const ENV_KEY_PATTERN = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/;

/**
 * Appends variables that exist in .env.example but are missing from .env.
 * Existing values in .env are never modified or removed.
 */
function syncEnvWithExample() {
  const exampleText = readFileSync(ENV_EXAMPLE_PATH, 'utf8');
  const envText = readFileSync(ENV_PATH, 'utf8');

  const existingKeys = new Set(Object.keys(parseEnvText(envText)));
  const exampleKeys = new Set(Object.keys(parseEnvText(exampleText)));

  const additions = [];
  const addedKeys = [];
  let commentBuffer = [];

  for (const line of exampleText.split(/\r?\n/)) {
    if (line.trim().startsWith('#')) {
      commentBuffer.push(line);
      continue;
    }

    const match = line.match(ENV_KEY_PATTERN);

    if (match && !existingKeys.has(match[1])) {
      additions.push(...commentBuffer, line);
      addedKeys.push(match[1]);
    }

    commentBuffer = [];
  }

  if (addedKeys.length > 0) {
    const separator = envText.endsWith('\n') ? '' : '\n';
    const header = '\n# --- added automatically from .env.example ---\n';
    writeFileSync(ENV_PATH, `${envText}${separator}${header}${additions.join('\n')}\n`);
    success(`Added ${addedKeys.length} new variable(s) to .env: ${addedKeys.join(', ')}`);
  }

  const obsolete = [...Object.keys(parseEnvText(envText))].filter((key) => !exampleKeys.has(key));
  if (obsolete.length > 0) {
    warn(`Variables in .env but not in .env.example (left unchanged): ${obsolete.join(', ')}`);
  }

  return addedKeys.length;
}

function prepareEnv() {
  const { created } = createEnvFileFromExample({
    envPath: ENV_PATH,
    examplePath: ENV_EXAMPLE_PATH,
  });

  if (created) success('Created .env from .env.example');
  else {
    log('.env already exists; checking for new variables in .env.example');
    if (syncEnvWithExample() === 0) log('.env is up to date with .env.example');
  }

  const variables = readEnv();
  assertRequiredVariables(variables, { filePath: ENV_PATH });

  // Values explicitly set in the terminal take precedence over .env.
  for (const [key, value] of Object.entries(variables)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  const secrets = REQUIRED_SECRET_NAMES.map((name) => variables[name]).filter(
    (value) => typeof value === 'string' && value.length > 0,
  );

  return { variables, secrets };
}

function mergedEnvironment(variables = {}) {
  return { ...variables, ...process.env };
}

// -----------------------------------------------------------------------------
// Free application ports (never terminate infrastructure ports)
// -----------------------------------------------------------------------------

function getWindowsPortPids(port) {
  const output = execFileSync('netstat', ['-ano', '-p', 'tcp'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  const pids = new Set();

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i);
    if (match && Number(match[1]) === Number(port)) {
      const pid = Number(match[2]);
      if (pid > 0 && pid !== process.pid) pids.add(pid);
    }
  }

  return [...pids];
}

function getPosixPortPids(port) {
  try {
    const output = execFileSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    return [
      ...new Set(
        output
          .split(/\r?\n/)
          .map((value) => Number(value.trim()))
          .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid),
      ),
    ];
  } catch (error) {
    if (error?.status === 1) return [];
    throw new Error(`Cannot inspect port ${port}. Install lsof or free the port manually.`);
  }
}

function stopPid(pid, port) {
  warn(`Port ${port} is occupied by PID ${pid}; stopping that process...`);

  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      try {
        process.kill(pid, 'SIGTERM');
      } catch (error) {
        if (error?.code !== 'ESRCH') throw error;
      }
    }
  } catch {
    throw new Error(`Could not stop PID ${pid} on port ${port}. Stop it manually and retry.`);
  }
}

async function waitForPortToBeFree(port, timeoutMs = 5_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (!(await isPortInUse(port))) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error(
    `Port ${port} is still in use after cleanup. Stop the process manually and retry.`,
  );
}

async function freePort(port) {
  let pids;

  try {
    pids = process.platform === 'win32' ? getWindowsPortPids(port) : getPosixPortPids(port);
  } catch (error) {
    throw new Error(`Unable to clean port ${port}: ${errorMessage(error)}`);
  }

  if (pids.length === 0) {
    success(`Port ${port} is already free`);
    return;
  }

  for (const pid of pids) stopPid(pid, port);
  await waitForPortToBeFree(port);
  success(`Port ${port} is now free`);
}

async function freeApplicationPorts(environment) {
  const backendPort = resolvePort(environment, 'BACKEND_PORT');
  const ports = [...new Set([backendPort, ...FRONTENDS.map((app) => app.port)])];

  log(`Checking application ports: ${ports.join(', ')}`);

  for (const port of ports) {
    await freePort(port);
  }
}

// -----------------------------------------------------------------------------
// Preflight
// -----------------------------------------------------------------------------

function getComposePorts() {
  try {
    const output = execFileSync('docker', ['compose', 'ps', '--format', 'json'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    return projectHostPortsFromComposePs(output);
  } catch {
    return new Set();
  }
}

async function preflight(environment) {
  const infrastructurePorts = resolveInfrastructurePorts(environment);

  await runPreflight([
    { id: 'node', run: () => probeNodeVersion() },
    { id: 'pnpm', run: () => probePnpmVersion() },
    { id: 'docker-cli', run: () => probeDockerCli() },
    { id: 'docker-daemon', run: () => probeDockerDaemon() },
    {
      id: 'ports',
      run: async () => {
        await assertInfrastructurePortsAvailable(infrastructurePorts, {
          isPortInUseFn: (port) => isPortInUse(port),
          getProjectPorts: getComposePorts,
        });

        for (const frontend of FRONTENDS) {
          if (await isPortInUse(frontend.port)) {
            throw new Error(
              `Port ${frontend.port} is still in use; required by ${frontend.packageName}.`,
            );
          }
        }
      },
    },
  ]);

  success('Preflight checks passed');
}

// -----------------------------------------------------------------------------
// Infrastructure and migrations
// -----------------------------------------------------------------------------

function startInfrastructure() {
  log('Starting MySQL, Redis and MinIO...');

  const result = runCommandSync('docker', ['compose', 'up', '-d', '--wait', ...COMPOSE_SERVICES]);

  if (result.code !== 0) {
    throw new Error('Infrastructure startup failed. Inspect it with: docker compose logs');
  }

  success('MySQL, Redis and MinIO are healthy');
}

function runMigrations() {
  log('Running database migrations...');

  const result = runCommandSync('pnpm', ['--filter', BACKEND_PACKAGE, 'db:migrate']);

  if (result.code !== 0) {
    throw new Error('Database migrations failed. Fix the error and retry.');
  }

  success('Database migrations completed');
}

// -----------------------------------------------------------------------------
// Child process management
// -----------------------------------------------------------------------------

function spawnWorkspaceProcess(label, packageName, scriptName, secrets) {
  const args = ['--filter', packageName, scriptName];

  // shell is needed for pnpm.cmd on Windows. Arguments are fixed constants.
  const child = spawn('pnpm', args, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    env: process.env,
  });

  const writeChildLine = (stream, writer) =>
    new LineStream((line) => {
      const safeLine = redactSecrets(line, secrets);
      writer(prefixLine(label, safeLine));
    });

  const stdout = writeChildLine('stdout', (line) => console.log(line));
  const stderr = writeChildLine('stderr', (line) => console.error(line));

  child.stdout?.on('data', (chunk) => stdout.push(chunk));
  child.stderr?.on('data', (chunk) => stderr.push(chunk));
  child.on('close', () => {
    stdout.flush();
    stderr.flush();
  });
  child.on('error', (error) => {
    errorLog(`[${label}] failed to start: ${error.message}`);
  });

  log(`Starting ${label}: pnpm --filter ${packageName} ${scriptName}`);
  return child;
}

function stopProcesses(children) {
  for (const child of children) {
    try {
      terminateProcessTree(child);
    } catch (error) {
      warn(`Could not stop a process cleanly: ${errorMessage(error)}`);
    }
  }
}

function printReadySummary(readyUrl, environment) {
  const minioPort = resolvePort(environment, 'MINIO_CONSOLE_PORT');
  const rows = [
    ['BACKEND API', readyUrl],
    ['FRONTEND', 'http://localhost:3001'],
    ['ADMIN PANEL', 'http://localhost:3002'],
    ['BUSINESS', 'http://localhost:3003'],
    ['MINIO CONSOLE', `http://localhost:${minioPort}`],
  ];

  console.log('');
  console.log(
    paint(
      '╔════════════════════════════════════════════════════════════════════╗',
      ansi.green,
      ansi.bold,
    ),
  );
  console.log(
    `${paint('║', ansi.green, ansi.bold)}${paint('                 🚀  DEVELOPMENT ENVIRONMENT READY                 ', ansi.green, ansi.bold)}${paint('║', ansi.green, ansi.bold)}`,
  );
  console.log(
    paint(
      '╠════════════════════════════════════════════════════════════════════╣',
      ansi.green,
      ansi.bold,
    ),
  );

  for (const [label, url] of rows) {
    const line = `  ${label.padEnd(13)} ${url}`;
    console.log(
      `${paint('║', ansi.green, ansi.bold)} ${paint(line.padEnd(66), ansi.white)}${paint('║', ansi.green, ansi.bold)}`,
    );
  }

  console.log(
    paint(
      '╠════════════════════════════════════════════════════════════════════╣',
      ansi.green,
      ansi.bold,
    ),
  );
  console.log(
    `${paint('║', ansi.green, ansi.bold)} ${paint('✔ Infrastructure healthy', ansi.green)}${' '.repeat(40)}${paint('║', ansi.green, ansi.bold)}`,
  );
  console.log(
    `${paint('║', ansi.green, ansi.bold)} ${paint('✔ Database migrations completed', ansi.green)}${' '.repeat(31)}${paint('║', ansi.green, ansi.bold)}`,
  );
  console.log(
    `${paint('║', ansi.green, ansi.bold)} ${paint('✔ API health check passed', ansi.green)}${' '.repeat(37)}${paint('║', ansi.green, ansi.bold)}`,
  );
  console.log(
    `${paint('║', ansi.green, ansi.bold)} ${paint('✔ Frontend readiness checks passed', ansi.green)}${' '.repeat(28)}${paint('║', ansi.green, ansi.bold)}`,
  );
  console.log(
    paint(
      '╠════════════════════════════════════════════════════════════════════╣',
      ansi.green,
      ansi.bold,
    ),
  );
  console.log(
    `${paint('║', ansi.green, ansi.bold)} ${paint('Ctrl+C stops the application processes; Docker services remain up.', ansi.yellow)}${paint('║', ansi.green, ansi.bold)}`,
  );
  console.log(
    paint(
      '╚════════════════════════════════════════════════════════════════════╝',
      ansi.green,
      ansi.bold,
    ),
  );
  console.log('');
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  const children = [];
  let shuttingDown = false;

  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`${signal}: stopping application processes. Docker services will remain running.`);
    stopProcesses(children);
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  if (process.platform === 'win32') {
    process.on('SIGBREAK', () => shutdown('SIGBREAK'));
  }

  function watchProcess(label, child) {
    child.on('exit', (code, signal) => {
      if (shuttingDown) return;
      shuttingDown = true;

      const reason = signal ? `signal ${signal}` : `exit code ${code}`;
      errorLog(`[${label}] stopped unexpectedly (${reason}). Stopping the other app processes...`);
      stopProcesses(children.filter((other) => other !== child));
      process.exit(1);
    });
  }

  try {
    printBanner();

    step(1, 'Environment setup');
    const { variables, secrets } = prepareEnv();
    const environment = mergedEnvironment(variables);
    success('Environment configuration is valid');

    step(2, 'Free application ports');
    await freeApplicationPorts(environment);

    step(3, 'Preflight checks');
    await preflight(environment);

    step(4, 'Infrastructure');
    startInfrastructure();

    step(5, 'Database migrations');
    runMigrations();

    step(6, 'Start API, worker and scheduler');
    const backendApps = [
      { label: 'API', packageName: BACKEND_PACKAGE, script: 'dev' },
      { label: 'WORKER', packageName: BACKEND_PACKAGE, script: 'dev:worker' },
      { label: 'SCHEDULER', packageName: BACKEND_PACKAGE, script: 'dev:scheduler' },
    ];

    for (const app of backendApps) {
      const child = spawnWorkspaceProcess(app.label, app.packageName, app.script, secrets);
      children.push(child);
      watchProcess(app.label, child);
    }

    step(7, 'Wait for API readiness');
    const backendPort = resolvePort(environment, 'BACKEND_PORT');
    const readyUrl = buildReadyUrl({
      port: backendPort,
      prefix: variables.BACKEND_API_PREFIX ?? process.env.BACKEND_API_PREFIX,
    });

    await waitForReady(readyUrl, { timeoutMs: READY_TIMEOUT_MS });
    success(`API health check passed: ${readyUrl}`);

    step(8, 'Start and verify frontends');
    for (const app of FRONTENDS) {
      const child = spawnWorkspaceProcess(app.label, app.packageName, 'dev', secrets);
      children.push(child);
      watchProcess(app.label, child);
    }

    // Do not print the final READY banner until all three web servers respond.
    await Promise.all(
      FRONTENDS.map(async (app) => {
        const url = `http://localhost:${app.port}`;
        await waitForReady(url, { timeoutMs: READY_TIMEOUT_MS });
        success(`${app.label} is responding at ${url}`);
      }),
    );

    printReadySummary(readyUrl, environment);
  } catch (error) {
    errorLog(`Startup failed: ${errorMessage(error)}`);
    shuttingDown = true;
    stopProcesses(children);
    process.exit(1);
  }

  // Keep this launcher alive while the child processes run.
  await new Promise(() => { });
}

main();
