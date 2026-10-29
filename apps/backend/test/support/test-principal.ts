import type { INestApplication } from '@nestjs/common';

import type { AuthenticatedPrincipalView } from '../../src/modules/identity/application/views/principal.view.js';

/**
 * The authenticated principal a test request carries.
 *
 * The real process resolves this from a bearer token in the global guard. The
 * HTTP-level specs that bind the tenant module directly have no guard, so they
 * install this principal as request state instead. It is the same trusted input
 * the guard would publish: a test can therefore exercise an authenticated
 * endpoint without reimplementing authentication.
 */
export const TEST_PRINCIPAL: AuthenticatedPrincipalView = {
  userId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f99',
  displayName: 'Test User',
  email: 'test.user@example.com',
};

/** Installs a request middleware that publishes `principal` on every request. */
export function authenticateAs(
  app: INestApplication,
  principal: AuthenticatedPrincipalView = TEST_PRINCIPAL,
): void {
  app.use(
    (
      request: { principal?: AuthenticatedPrincipalView },
      _response: unknown,
      next: () => void,
    ): void => {
      request.principal = principal;
      next();
    },
  );
}
