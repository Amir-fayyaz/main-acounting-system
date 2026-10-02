import type { INestApplication } from '@nestjs/common';
import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTenantContext } from '../src/shared/tenant/tenant-context.js';
import { TenantScope } from '../src/shared/tenant/tenant-scope.js';

/**
 * Tenant context over real HTTP requests (SHR-007).
 *
 * The shared contract in `src/shared/tenant/` proves creation, propagation and
 * isolation in unit runs; this spec proves the two facts only a live request
 * pipeline can:
 *
 * - A client cannot select a tenant by supplying one — no header, no query, no
 *   body field is ever read as tenant identity (doc 17, section 8).
 * - Two concurrent requests that establish different scopes stay isolated, and
 *   a scope established inside one request never appears in the next one.
 *
 * The `establish` route is a test-only stand-in for the trusted entry point
 * that authentication will later be: SHR-007 ships no authentication (out of
 * scope), so nothing in production resolves a tenant yet — and that is exactly
 * why a spoofed header must land on `missing`.
 */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Controller('tenant-probe')
class TenantProbeController {
  /**
   * Test-only: reports whatever the client sent *and* the ambient scope. The
   * header is echoed purely to prove it was received and then ignored.
   */
  @Get('spoof')
  spoof(@Headers('x-tenant-id') tenantHeader?: string): Record<string, unknown> {
    return { receivedHeader: tenantHeader ?? null, scope: TenantScope.current() };
  }

  /**
   * Test-only: stands in for the future authenticated entry point — the only
   * place allowed to establish a scope from an identity. It wraps the work in
   * the tenant the *server* picked for this call, exactly as the Worker wraps a
   * job in the company its envelope carries.
   */
  @Get('establish/:tenantId')
  async establish(
    @Param('tenantId') tenantId: string,
    @Query('delayMs') delayMs?: string,
  ): Promise<Record<string, unknown>> {
    return TenantScope.run(
      createTenantContext(tenantId, { correlationId: 'http-flow-1' }),
      async () => {
        await sleep(delayMs === undefined ? 0 : Number(delayMs));

        return { scope: TenantScope.current() };
      },
    );
  }
}

describe('tenant context over HTTP (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TenantProbeController],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('ignores a tenant id a client supplies in a header', async () => {
    const response = await request(app.getHttpServer())
      .get('/tenant-probe/spoof')
      .set('x-tenant-id', 'tenant-attacker')
      .expect(200);

    expect(response.body.receivedHeader).toBe('tenant-attacker');
    expect(response.body.scope).toEqual({ state: 'missing' });
  });

  it('establishes the scope inside the request and reports it to the handler', async () => {
    const response = await request(app.getHttpServer())
      .get('/tenant-probe/establish/tenant-42')
      .expect(200);

    expect(response.body.scope).toEqual({
      state: 'available',
      tenantId: 'tenant-42',
      correlationId: 'http-flow-1',
    });
  });

  it('keeps concurrent requests on their own tenant', async () => {
    const server = app.getHttpServer();

    const [first, second] = await Promise.all([
      request(server).get('/tenant-probe/establish/tenant-a?delayMs=60').expect(200),
      request(server).get('/tenant-probe/establish/tenant-b?delayMs=10').expect(200),
    ]);

    expect(first.body.scope).toMatchObject({ state: 'available', tenantId: 'tenant-a' });
    expect(second.body.scope).toMatchObject({ state: 'available', tenantId: 'tenant-b' });
  });

  it('never carries a scope from one request into the next', async () => {
    const server = app.getHttpServer();

    await request(server).get('/tenant-probe/establish/tenant-42').expect(200);

    const next = await request(server).get('/tenant-probe/spoof').expect(200);

    expect(next.body.scope).toEqual({ state: 'missing' });
  });
});
