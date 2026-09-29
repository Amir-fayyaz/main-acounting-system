import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';

/**
 * `.env` discovery for the backend process (FND-003).
 *
 * The files are located relative to this module instead of the working
 * directory, so `pnpm dev`, `node dist/main.js` and the Docker image all read
 * the same files regardless of where the process was started.
 *
 * Precedence, from weakest to strongest:
 *
 * 1. repository-root `.env` — shared development defaults for the workspace;
 * 2. `apps/backend/.env` — per-process overrides;
 * 3. the real process environment — Docker, Compose and CI always win, which is
 *    what makes the FND-002 container configuration effective without touching
 *    any file inside the image.
 *
 * This module is the only place that reads `.env` files; everything else goes
 * through `loadConfiguration`.
 */

/** `apps/backend/.env` */
const PROCESS_ENV_FILE = fileURLToPath(new URL('../../../.env', import.meta.url));

/** Repository-root `.env` */
const WORKSPACE_ENV_FILE = fileURLToPath(new URL('../../../../../.env', import.meta.url));

export type EnvironmentTarget = Record<string, string | undefined>;

/** Parses one `.env` file; a missing file contributes no values. */
export function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) {
    return {};
  }

  return parse(readFileSync(path));
}

/**
 * Merges `sources` into `target`: later sources win over earlier ones, and a
 * value already present in `target` is never overwritten.
 *
 * The two rules apply in order — the sources are merged first, then the result
 * is applied to `target` — so an already-set process environment beats the files
 * while the more specific file still beats the shared one.
 */
export function mergeEnvironmentValues(
  sources: readonly Record<string, string>[],
  target: EnvironmentTarget,
): void {
  const merged: Record<string, string> = {};

  for (const source of sources) {
    Object.assign(merged, source);
  }

  for (const [key, value] of Object.entries(merged)) {
    if (target[key] === undefined) {
      target[key] = value;
    }
  }
}

/**
 * Loads the `.env` files into `target` (the process environment by default).
 * Calling it twice is a no-op, so a process entry point and the Nest module may
 * both call it without changing the result.
 */
export function loadDotEnvFiles(target: EnvironmentTarget = process.env): void {
  mergeEnvironmentValues([readEnvFile(WORKSPACE_ENV_FILE), readEnvFile(PROCESS_ENV_FILE)], target);
}
