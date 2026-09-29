/**
 * Runtime configuration for the web client.
 *
 * Two base URLs are needed because two different clients call the backend:
 *
 * - browser  -> `NEXT_PUBLIC_API_BASE_URL`, must be an address the user's machine
 *               can reach (for local development: http://127.0.0.1:3000/api).
 * - server   -> `INTERNAL_API_BASE_URL`, must be an address this process can reach
 *               (when the app runs in Docker Compose: http://backend:3000/api).
 *
 * Both fall back to the local backend so a fresh checkout runs without extra
 * setup. Nothing here may hold a secret: `NEXT_PUBLIC_*` values are shipped to
 * the browser.
 */
const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3000/api';

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function readBaseUrl(configured: string | undefined): string {
  return configured ? stripTrailingSlashes(configured) : DEFAULT_API_BASE_URL;
}

export function getPublicApiBaseUrl(): string {
  return readBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
}

export function getServerApiBaseUrl(): string {
  return readBaseUrl(process.env.INTERNAL_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL);
}
