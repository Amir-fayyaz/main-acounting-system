import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { TenantHeaderInterceptor } from './tenant-header.interceptor';
import { TenantContextService } from '@modules/tenants/application';

const VALID_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

const mockContext = (headerValue: string | string[] | undefined): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: { 'x-tenant-id': headerValue } }),
      getResponse: () => ({}),
    }),
  }) as unknown as ExecutionContext;

const nextHandler = (observable = of('ok')): CallHandler => ({ handle: () => observable });

describe('TenantHeaderInterceptor', () => {
  it('binds a valid x-tenant-id header into the context for the handler lifetime', async () => {
    const contextService = new TenantContextService();
    const interceptor = new TenantHeaderInterceptor(contextService);

    const result$ = interceptor.intercept(mockContext(`  ${VALID_TENANT_ID.toUpperCase()}  `), nextHandler());

    await new Promise<void>((resolve) => {
      result$.subscribe({
        next: () => expect(contextService.getTenantId()).toBe(VALID_TENANT_ID),
        complete: () => resolve(),
      });
    });

    expect(contextService.getTenantId()).toBeNull();
  });

  it('clears the context when the handler errors', () => {
    const contextService = new TenantContextService();
    const interceptor = new TenantHeaderInterceptor(contextService);

    interceptor
      .intercept(mockContext(VALID_TENANT_ID), nextHandler(throwError(() => new Error('handler failed'))))
      .subscribe({ error: () => undefined });

    expect(contextService.getTenantId()).toBeNull();
  });

  it.each([undefined, '', '   ', ['a', 'b'], 'not-a-uuid', '550e8400-e29b-11d4-a716-446655440000'] as (
    string | string[] | undefined
  )[])('does not bind an invalid header (%p)', (header) => {
    const contextService = new TenantContextService();
    const interceptor = new TenantHeaderInterceptor(contextService);

    interceptor
      .intercept(mockContext(header), nextHandler())
      .subscribe({ next: () => undefined, error: () => undefined, complete: () => undefined });

    expect(contextService.getTenantId()).toBeNull();
  });
});
