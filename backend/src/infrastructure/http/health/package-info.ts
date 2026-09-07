import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Reads the backend package.json (four levels above this file in both the src
 * and compiled dist layouts). Falls back to defaults so a missing file never
 * breaks health reporting.
 */
const PACKAGE_JSON_PATH = join(__dirname, '..', '..', '..', '..', 'package.json');

export interface AppPackageInfo {
  readonly name: string;
  readonly version: string;
}

export const APP_PACKAGE = Symbol('APP_PACKAGE');

let cached: AppPackageInfo | undefined;

export function readPackageInfo(): AppPackageInfo {
  if (cached) {
    return cached;
  }
  try {
    const raw = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8')) as Partial<AppPackageInfo>;
    cached = {
      name: raw.name ?? 'accounting-saas-backend',
      version: raw.version ?? '0.0.0',
    };
  } catch {
    cached = { name: 'accounting-saas-backend', version: '0.0.0' };
  }
  return cached;
}
