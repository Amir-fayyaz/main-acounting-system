/**
 * `.env` helpers for `pnpm run dev:local` (Dev bootstrap).
 *
 * Pure functions only (`fs` is injectable), so they can be unit tested without
 * touching the real workspace. Rules:
 *
 * - `.env` is created from `.env.example` only when it does not exist; an
 *   existing `.env` is never read to decide anything nor ever written to.
 * - Required secret variables are validated by presence only: the error names
 *   the missing variables and never echoes any value.
 */

import { copyFileSync, existsSync } from 'node:fs';

export const REQUIRED_VARIABLES = [
  'MYSQL_PASSWORD',
  'MYSQL_ROOT_PASSWORD',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
];

/**
 * Minimal `.env` text parser (dotenv-projectable subset): `KEY=VALUE` lines,
 * `#` comments, blank lines, optional surrounding quotes trimmed.
 */
export function parseEnvText(text) {
  const variables = {};
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"')))
    ) {
      value = value.slice(1, -1);
    }
    variables[key] = value;
  }
  return variables;
}

export class MissingEnvVariablesError extends Error {
  constructor(missing, filePath) {
    super(
      `Required environment variables are missing in "${filePath}": ${missing.join(', ')}. ` +
        `Set them in the file and run "pnpm run dev:local" again (values are never echoed).`,
    );
    this.name = 'MissingEnvVariablesError';
    this.missing = [...missing];
    this.filePath = filePath;
  }
}

/**
 * Validates that every required variable has a non-empty value.
 * Only variable *names* may ever appear in the error message.
 */
export function assertRequiredVariables(
  variables,
  { required = REQUIRED_VARIABLES, filePath = '.env' } = {},
) {
  const missing = required.filter((name) => {
    const value = variables[name];
    return value === undefined || value.trim() === '';
  });
  if (missing.length > 0) {
    throw new MissingEnvVariablesError(missing, filePath);
  }
  return variables;
}

export class EnvCreationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EnvCreationError';
  }
}

/**
 * Creates `.env` from `.env.example` when it is missing; an existing `.env` is
 * never overwritten or modified. Returns whether the file was newly created.
 */
export function createEnvFileFromExample({
  envPath,
  examplePath,
  fs = { existsSync, copyFileSync },
}) {
  if (!fs.existsSync(examplePath)) {
    throw new EnvCreationError(
      `"${examplePath}" was not found; the workspace file template is missing.`,
    );
  }
  if (fs.existsSync(envPath)) {
    return { created: false, envPath };
  }
  fs.copyFileSync(examplePath, envPath);
  if (!fs.existsSync(envPath)) {
    throw new EnvCreationError(`Could not create "${envPath}".`);
  }
  return { created: true, envPath };
}
