/**
 * Public runtime configuration for the browser.
 *
 * Only `NEXT_PUBLIC_*` values are readable here. The default points at the local
 * backend from `.env.example`, so a fresh checkout runs without extra setup.
 */
const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3000/api';

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!configured) {
    return DEFAULT_API_BASE_URL;
  }

  return configured.replace(/\/+$/, '');
}
