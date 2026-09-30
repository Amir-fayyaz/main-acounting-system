/**
 * The API conventions every HTTP endpoint shares (FND-006, ADR-013, TECH-010).
 *
 * These values are the single source of truth for the versioning convention: a
 * module never hardcodes a version segment in its `@Controller()` path, it just
 * extends the default applied in `bootstrap.ts`.
 */

/**
 * The version served by this deployment. Public contracts are versioned so a
 * breaking change can ship a new one without breaking existing clients
 * (ADR-013, section 4). One version, applied uniformly: modules must not differ.
 */
export const API_VERSION = '1';

/**
 * Where the generated OpenAPI UI is mounted, below the global API prefix. The
 * document is exposed in development and test only (see `openapi/openapi.ts`).
 */
export const OPENAPI_DOCUMENT_PATH = 'docs';
