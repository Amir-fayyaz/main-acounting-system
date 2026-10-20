import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AUTHORIZATION_POLICY_METADATA } from '../authorization/authorization-policy.js';
import { ApiErrorException } from '../errors/api-error.exception.js';
import { API_ERROR_CODES } from '../errors/api-error.registry.js';
import { createTenantContext } from '../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../shared/tenant/tenant-scope.js';
import { TenantScopeInterceptor } from './tenant-scope.interceptor.js';

function contextWith(
  params: Record<string, string | undefined>,
  policy: { permission: string; tenantParam?: string } | undefined,
): ExecutionContext {
  const handler = () => undefined;
  const controller = class {};
  const reflector = new Reflector();
  if (policy !== undefined) {
    Reflect.defineMetadata(AUTHORIZATION_POLICY_METADATA, policy, handler);
  }
  const switchToHttp = () => ({ getRequest: () => ({ params }) });
  return {
    switchToHttp,
    getHandler: () => handler,
    getClass: () => controller,
  } as unknown as ExecutionContext;
}

function reportingHandler(
  build: () => Observable<unknown> = () =>
    of(TenantScope.currentTenantId() ?? 'no-tenant'),
): CallHandler {
  return { handle: build } as CallHandler;
}

describe('TenantScopeInterceptor', () => {
  it('leaves the handler without a tenant scope when the route is not tenant-scoped', async () => {
    const interceptor = new TenantScopeInterceptor(new Reflector());
    const value = await firstValueFrom(
      interceptor.intercept(contextWith({}, undefined), reportingHandler()),
    );
    expect(value).toBe('no-tenant');
    expect(TenantScope.current().state).toBe('missing');
  });

  it('leaves the handler without a tenant scope for platform-only Authorize policies', async () => {
    const interceptor = new TenantScopeInterceptor(new Reflector());
    const ctx = contextWith({}, { permission: 'user.manage' });
    // Reflector needs the metadata; re-bind via getAllAndOverride path by
    // attaching policy through Reflect on the handler the context returns.
    const value = await firstValueFrom(interceptor.intercept(ctx, reportingHandler()));
    expect(value).toBe('no-tenant');
  });

  it('establishes TenantScope from the verified route param for tenant-scoped routes', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue({
        permission: 'role.read',
        tenantParam: 'tenantId',
      }),
    } as unknown as Reflector;
    const interceptor = new TenantScopeInterceptor(reflector);

    const value = await firstValueFrom(
      interceptor.intercept(
        contextWith({ tenantId: 'tenant-42' }, undefined),
        reportingHandler(),
      ),
    );

    expect(value).toBe('tenant-42');
    expect(TenantScope.current().state).toBe('missing');
  });

  it('rejects a missing tenant param on a tenant-scoped route with TENANT_REQUIRED', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue({
        permission: 'role.read',
        tenantParam: 'tenantId',
      }),
    } as unknown as Reflector;
    const interceptor = new TenantScopeInterceptor(reflector);

    await expect(
      firstValueFrom(
        interceptor.intercept(contextWith({}, undefined), reportingHandler()),
      ),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiErrorException);
      expect((error as ApiErrorException).code).toBe(API_ERROR_CODES.TENANT_REQUIRED);
      expect((error as ApiErrorException).getStatus()).toBe(400);
      return true;
    });
  });

  it('rejects a blank tenant param on a tenant-scoped route with TENANT_REQUIRED', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue({
        permission: 'role.read',
        tenantParam: 'tenantId',
      }),
    } as unknown as Reflector;
    const interceptor = new TenantScopeInterceptor(reflector);

    await expect(
      firstValueFrom(
        interceptor.intercept(
          contextWith({ tenantId: '   ' }, undefined),
          reportingHandler(),
        ),
      ),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiErrorException);
      expect((error as ApiErrorException).code).toBe(API_ERROR_CODES.TENANT_REQUIRED);
      return true;
    });
  });

  it('rejects a malformed tenant id on a tenant-scoped route with TENANT_REQUIRED', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue({
        permission: 'role.read',
        tenantParam: 'tenantId',
      }),
    } as unknown as Reflector;
    const interceptor = new TenantScopeInterceptor(reflector);

    await expect(
      firstValueFrom(
        interceptor.intercept(
          contextWith({ tenantId: 'bad id with spaces!' }, undefined),
          reportingHandler(),
        ),
      ),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiErrorException);
      expect((error as ApiErrorException).code).toBe(API_ERROR_CODES.TENANT_REQUIRED);
      return true;
    });
  });

  it('propagates a handler failure and still tears the scope down', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue({
        permission: 'role.read',
        tenantParam: 'tenantId',
      }),
    } as unknown as Reflector;
    const interceptor = new TenantScopeInterceptor(reflector);
    const failing = reportingHandler(() => throwError(() => new Error('boom')));

    await expect(
      firstValueFrom(
        interceptor.intercept(
          contextWith({ tenantId: 'tenant-42' }, undefined),
          failing,
        ),
      ),
    ).rejects.toThrow('boom');

    expect(TenantScope.current().state).toBe('missing');
  });

  it('keeps concurrent tenant scopes isolated (AsyncLocalStorage)', async () => {
    const a = createTenantContext('tenant-A');
    const b = createTenantContext('tenant-B');

    const interleave = (): Promise<void> =>
      new Promise((resolve) => setTimeout(resolve, 5));

    const [seenA, seenB] = await Promise.all([
      TenantScope.run(a, async () => {
        await interleave();
        return TenantScope.requireTenantId();
      }),
      TenantScope.run(b, async () => {
        await interleave();
        return TenantScope.requireTenantId();
      }),
    ]);

    expect(seenA).toBe('tenant-A');
    expect(seenB).toBe('tenant-B');
    expect(TenantScope.current().state).toBe('missing');
  });
});
