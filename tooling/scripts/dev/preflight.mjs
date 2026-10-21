/**
 * Preflight checks for `pnpm run dev:local` (Dev bootstrap).
 *
 * A preflight is an ordered list of `{ id, run }` steps; the first failure
 * stops the run with a clear, actionable message before anything is started.
 * Every external capability (versions, CLI, daemon) is injectable so the
 * ordering and fail-fast behaviour is unit-testable.
 */

const { execFileSync } = await import('node:child_process');

export class PreflightError extends Error {
  constructor(stepId, cause) {
    super(cause?.message ?? String(cause));
    this.name = 'PreflightError';
    this.stepId = stepId;
    this.step = stepId;
    this.cause = cause;
  }
}

/**
 * Runs checks in order, stopping at the first failure. Returns the list of
 * passed step ids.
 */
export async function runPreflight(steps) {
  const passed = [];
  for (const step of steps) {
    try {
      await step.run();
    } catch (error) {
      throw new PreflightError(step.id, error);
    }
    passed.push(step.id);
  }
  return passed;
}

/** Compares a reported version string against a required minimum. */
export function versionAtLeast(version, minimum) {
  const normalize = (value) =>
    String(value)
      .replace(/^v/, '')
      .split(/[-+]/)[0]
      .split('.')
      .map((part) => Number(part) || 0);
  const actual = normalize(version);
  const required = normalize(minimum);
  for (let index = 0; index < Math.max(actual.length, required.length); index += 1) {
    const a = actual[index] ?? 0;
    const b = required[index] ?? 0;
    if (a !== b) return a > b;
  }
  return true;
}

/** Parses the major version out of `pnpm --version` / `node --version` output. */
export function parseVersionFromOutput(output) {
  const match = /(\d+\.\d+\.\d+)/.exec(String(output));
  if (!match)
    throw new Error(`Could not parse a version from: ${String(output).trim().slice(0, 80)}`);
  return match[1];
}

/** Formats the version requirement error for Node and pnpm. */
export function versionRequirementError(tool, actual, required, hint) {
  return new Error(
    `${tool} ${required} or newer is required (found ${actual}). ${hint ?? ''}`.trim(),
  );
}

// --- External capability probes (default implementations) -------------------

export async function probeNodeVersion({
  nodeVersion = process.version,
  required = '22.0.0',
} = {}) {
  if (!versionAtLeast(nodeVersion, required)) {
    throw versionRequirementError('Node.js', nodeVersion, required, 'Install Node.js 22 or newer.');
  }
  return `Node.js ${nodeVersion.replace(/^v/, '')}`;
}

export async function probePnpmVersion({ run = execFileSync, required = '10.0.0' } = {}) {
  const output = (() => {
    try {
      return run('pnpm', ['--version'], { encoding: 'utf8', shell: true });
    } catch {
      throw new Error(
        'pnpm was not found on PATH. Install it with `corepack enable` or https://pnpm.io/installation.',
      );
    }
  })();
  const version = parseVersionFromOutput(output);
  if (!versionAtLeast(version, required)) {
    throw versionRequirementError(
      'pnpm',
      version,
      required,
      'Upgrade pnpm (`corepack use pnpm@latest`).',
    );
  }
  return `pnpm ${version}`;
}

export async function probeDockerCli({ run = execFileSync } = {}) {
  try {
    run('docker', ['--version'], { encoding: 'utf8', shell: true, stdio: 'pipe' });
  } catch {
    throw new Error(
      'The Docker CLI was not found on PATH. Install Docker Desktop (Windows/macOS) or Docker Engine (Linux), then start it.',
    );
  }
  return 'Docker CLI available';
}

export async function probeDockerDaemon({ run = execFileSync } = {}) {
  try {
    run('docker', ['info', '--format', 'ok'], { encoding: 'utf8', shell: true, stdio: 'pipe' });
  } catch {
    throw new Error(
      'The Docker daemon is not running. Start Docker Desktop (Windows/macOS) or `systemctl start docker` (Linux), then run `pnpm run dev:local` again.',
    );
  }
  return 'Docker daemon running';
}
