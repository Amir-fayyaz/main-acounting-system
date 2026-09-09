import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { TenantHeaderInterceptor } from './tenant-header.interceptor';
import { TenantContextService } from '@modules/tenants/application';

const mockContext = (headerValue: string | string[] | undefined): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: { 'x-tenant-id': headerValue } }),
      getResponse: () => ({}),
    }),
  }) as unknown as ExecutionContext;

const nextHandler = (): CallHandler => ({ handle: () => of('ok') });

describe('TenantHeaderInterceptor', () => {
  it('binds a valid x-tenant-id header into the context for the handler lifetime', async () => {
    const contextService = new TenantContextService();
    const interceptor = new TenantHeaderInterceptor(contextService);

    const result$ = interceptor.intercept(mockContext('tenant-42'), nextHandler());

    let subscription: { unsubscribe(): void } | undefined;
    await new Promise<void>((resolve) => {
      subscription = result$.subscribe({
        next: () => expect(contextService.getTenantId()).toBe('tenant-42'),
        complete: () => resolve(),
      });
    });
    subscription?.unsubscribe();

    expect(contextService.getTenantId()).toBeNull();
  });

  it('leaves the context null when the header is absent', () => {
    const contextService = new TenantContextService();
    const interceptor = new TenantHeaderInterceptor(contextService);

    interceptor
      .intercept(mockContext(undefined), nextHandler())
      .subscribe({ next: () => undefined, error: () => undefined, complete: () => undefined });

    expect(contextService.getTenantId()).toBeNull();
  });

  it('leaves the context null for an empty header', () => {
    const contextService = new TenantContextService();
    const interceptor = new TenantHeaderInterceptor(contextService);

    interceptor
      .intercept(mockContext('   '), nextHandler())
      .subscribe({ next: () => undefined, error: () => undefined, complete: () => undefined });

    expect(contextService.getTenantId()).toBeNull();
  });

  it('ignores array-valued headers', () => {
    const contextService = new TenantContextService();
    const interceptor = new TenantHeaderInterceptor(contextService);

    interceptor
      .intercept(mockContext(['a', 'b']), nextHandler())
      .subscribe({ next: () => undefined, error: () => undefined, complete: () => undefined });

    expect(contextService.getTenantId()).toBeNull();
  });
});
