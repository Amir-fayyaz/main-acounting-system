/**
 * Token-file rendering for the local monitoring stack (FND-017).
 *
 * `pnpm obs:up` renders the Prometheus bearer-token file from `METRICS_TOKEN`
 * in the workspace `.env` before starting the `observability` profile. Rules:
 *
 * - the token is never echoed, never logged, never written anywhere but the
 *   runtime file (git-ignored);
 * - the file is written with restrictive permissions (owner read/write) and is
 *   overwritten on every start, so a rotated token in `.env` always wins;
 * - a missing or empty `METRICS_TOKEN` is an error: starting Prometheus
 *   without a credential would make every scrape fail 401 with no hint why.
 *
 * Pure functions only (`fs` is injectable), so they are unit-testable without
 * touching the real workspace.
 */

/** Where Compose expects the rendered file. */
export const TOKEN_FILE_PATH = 'infrastructure/observability/runtime/metrics_token';

/**
 * Extracts the METRICS_TOKEN value from parsed `.env` variables.
 *
 * Returns the trimmed token, or throws (never echoing a value) when it is
 * missing or empty.
 */
export function requireMetricsToken(variables, envPath = '.env') {
  const token = variables['METRICS_TOKEN'];

  if (typeof token !== 'string' || token.trim() === '') {
    throw new Error(
      `METRICS_TOKEN is missing or empty in "${envPath}". ` +
        `Copy .env.example to .env and set it — Prometheus cannot scrape ` +
        `/api/metrics without the bearer token.`,
    );
  }

  return token.trim();
}

/**
 * Renders the token file: restrictive permissions, contents only the token.
 *
 * `fs` is injectable for tests; the real caller passes `node:fs`. The chmod is
 * best-effort on Windows (no-op there) and enforced on POSIX.
 */
export function renderTokenFile(fs, tokenPath, token) {
  fs.mkdirSync(path_of(tokenPath), { recursive: true });
  fs.writeFileSync(tokenPath, `${token}\n`, { encoding: 'utf8', mode: 0o600 });

  try {
    fs.chmodSync(tokenPath, 0o600);
  } catch {
    // Windows: chmod is not enforced; the file is local, git-ignored and
    // bound read-only into the container, so this is acceptable locally.
  }
}

/** The directory of a file path (POSIX or Windows separators). */
function path_of(filePath) {
  const index = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));

  return index <= 0 ? '.' : filePath.slice(0, index);
}
