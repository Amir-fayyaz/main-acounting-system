import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
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
  authorization?: { readonly tenantId?: string },
): ExecutionContext {
  const handler = () => undefined;
  const controller = class {};
  if (policy !== undefined) {
    Reflect.defineMetadata(AUTHORIZATION_POLICY_METADATA, policy, handler);
  }
  const switchToHttp = () => ({
    getRequest: () => ({ params, ...(authorization === undefined ? {} : { authorization }) }),
  });
  return {
    switchToHttp,
    getHandler: () => handler,
    getClass: () => controller,
  } as unknown as ExecutionContext;
}

function reportingHandler(
  build: () => Observable<unknown> = () => of(TenantScope.currentTenantId() ?? 'no-tenant'),
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
      interceptor.intercept(contextWith({ tenantId: 'tenant-42' }, undefined), reportingHandler()),
    );

    expect(value).toBe('tenant-42');
    expect(TenantScope.current().state).toBe('missing');
  });

  it('infers the conventional :tenantId parameter the authorization guard verified', async () => {
    const interceptor = new TenantScopeInterceptor(new Reflector());
    // The policy omits tenantParam; the guard treats :tenantId as tenant-scoped
    // by convention, and the interceptor must publish exactly that target.
    const value = await firstValueFrom(
      interceptor.intercept(
        contextWith({ tenantId: 'tenant-42' }, { permission: 'user.read' }),
        reportingHandler(),
      ),
    );

    expect(value).toBe('tenant-42');
    expect(TenantScope.current().state).toBe('missing');
  });

  it('infers :id on the root tenants resource', async () => {
    const interceptor = new TenantScopeInterceptor(new Reflector());
    const handler = () => undefined;
    class TenantsController {}
    Reflect.defineMetadata(PATH_METADATA, 'tenants', TenantsController);
    Reflect.defineMetadata(AUTHORIZATION_POLICY_METADATA, { permission: 'company.read' }, handler);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ params: { id: 'tenant-42' } }) }),
      getHandler: () => handler,
      getClass: () => TenantsController,
    } as unknown as ExecutionContext;

    const value = await firstValueFrom(interceptor.intercept(context, reportingHandler()));

    expect(value).toBe('tenant-42');
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
      firstValueFrom(interceptor.intercept(contextWith({}, undefined), reportingHandler())),
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
        interceptor.intercept(contextWith({ tenantId: '   ' }, undefined), reportingHandler()),
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

  it('publishes the tenant the authorization boundary proved, not the one in the route', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue({
        permission: 'role.read',
        tenantParam: 'tenantId',
      }),
    } as unknown as Reflector;
    const interceptor = new TenantScopeInterceptor(reflector);

    // The route names one tenant; the membership the guard verified belongs to
    // another spelling of the same company. The proven identity wins.
    const value = await firstValueFrom(
      interceptor.intercept(
        contextWith({ tenantId: '018F0D3C-6D0F-7A4B-9D4E-2B3C4D5E6F70' }, undefined, {
          tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
        }),
        reportingHandler(),
      ),
    );

    expect(value).toBe('018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70');
  });

  it('refuses a tenant-scoped route whose tenant could not be proven', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue({
        permission: 'role.read',
        tenantParam: 'tenantId',
      }),
    } as unknown as Reflector;
    const interceptor = new TenantScopeInterceptor(reflector);

    // The boundary ran and allowed the route, yet it proved no tenant: that is
    // a contradiction, and the answer to it is refusal.
    await expect(
      firstValueFrom(
        interceptor.intercept(
          contextWith({ tenantId: 'tenant-42' }, undefined, {}),
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
        interceptor.intercept(contextWith({ tenantId: 'tenant-42' }, undefined), failing),
      ),
    ).rejects.toThrow('boom');

    expect(TenantScope.current().state).toBe('missing');
  });

  it('keeps concurrent tenant scopes isolated (AsyncLocalStorage)', async () => {
    const a = createTenantContext('tenant-A');
    const b = createTenantContext('tenant-B');

    const interleave = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5));

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
