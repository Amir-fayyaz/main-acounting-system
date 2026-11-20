import { HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError, type Observable } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { MetricsInterceptor } from './metrics.interceptor.js';
import { MetricsService } from './metrics.service.js';

/** The parts of the HTTP context the interceptor touches. */
function httpContext(
  method: string,
  routePath?: string,
  statusCode = 200,
): { context: ExecutionContext; response: { statusCode: number } } {
  const response: { statusCode: number } = { statusCode };

  const context = {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        ...(routePath !== undefined ? { route: { path: routePath } } : {}),
      }),
      getResponse: () => response,
    }),
  };

  return { context: context as unknown as ExecutionContext, response };
}

function handlerReturning(result: string): CallHandler {
  return { handle: (): Observable<string> => of(result) };
}

function handlerFailingWith(error: unknown): CallHandler {
  return { handle: (): Observable<never> => throwError(() => error) };
}

describe('MetricsInterceptor', () => {
  let metrics: MetricsService;
  let interceptor: MetricsInterceptor;

  beforeEach(() => {
    metrics = new MetricsService();
    interceptor = new MetricsInterceptor(metrics);
  });

  it('observes the duration of a successful request with the matched route pattern', async () => {
    const { context } = httpContext('GET', '/api/v1/examples/:id');

    await observed(interceptor, context, handlerReturning('ok'));

    const labels = { method: 'GET', route: '/api/v1/examples/:id', status_code: '200' };

    expect(await seriesCount(metrics, labels)).toBe(1);
    expect(await seriesSum(metrics, labels)).toBeGreaterThan(0);
  });

  it('labels a request that matched no route as unmatched', async () => {
    const { context } = httpContext('GET');

    await observed(interceptor, context, handlerReturning('ok'));

    const series = await seriesWhere(metrics, (labels) => labels.route === 'unmatched');

    expect(series?.labels.method).toBe('GET');
    expect(series?.labels.status_code).toBe('200');
  });

  it('records the status an HttpException carries and re-throws it', async () => {
    const { context } = httpContext('GET', '/api/v1/examples/:id');
    const failure = new HttpException('missing', HttpStatus.NOT_FOUND);

    const outcome = await failed(interceptor, context, handlerFailingWith(failure));

    expect(outcome).toBe(failure);

    const labels = { method: 'GET', route: '/api/v1/examples/:id', status_code: '404' };

    expect(await seriesCount(metrics, labels)).toBe(1);
  });

  it('maps an unexpected failure to a 500 observation and still re-throws', async () => {
    const { context } = httpContext('POST', '/api/v1/examples');
    const failure = new Error('boom');

    const outcome = await failed(interceptor, context, handlerFailingWith(failure));

    expect(outcome).toBe(failure);

    const labels = { method: 'POST', route: '/api/v1/examples', status_code: '500' };

    expect(await seriesCount(metrics, labels)).toBe(1);
  });

  it('does not observe a request when the context is not HTTP', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;

    const outcome = await failed(interceptor, context, handlerFailingWith(new Error('boom')));

    expect(outcome).toBeInstanceOf(Error);
  });

  /** Runs the interceptor around a completing handler. */
  function observed(
    target: MetricsInterceptor,
    context: ExecutionContext,
    handler: CallHandler,
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      target.intercept(context, handler).subscribe({ complete: () => resolve() });
    });
  }

  /** Runs the interceptor around a failing handler and captures the error. */
  function failed(
    target: MetricsInterceptor,
    context: ExecutionContext,
    handler: CallHandler,
  ): Promise<unknown> {
    return new Promise<unknown>((resolve) => {
      target.intercept(context, handler).subscribe({ error: (error) => resolve(error) });
    });
  }

  /** The `http_request_duration_seconds` series whose labels match `where`. */
  async function seriesWhere(
    service: MetricsService,
    where: (labels: Record<string, string>) => boolean,
  ): Promise<{ labels: Record<string, string> } | undefined> {
    const values = await histogramValues(service);

    return values.find((value) => where(value.labels));
  }

  /** The `_count` series of the histogram for the given label set. */
  async function seriesCount(
    service: MetricsService,
    labels: Record<string, string>,
  ): Promise<number | undefined> {
    return (await seriesBySuffix(service, labels, '_count'))?.value;
  }

  /** The `_sum` series of the histogram for the given label set. */
  async function seriesSum(
    service: MetricsService,
    labels: Record<string, string>,
  ): Promise<number | undefined> {
    return (await seriesBySuffix(service, labels, '_sum'))?.value;
  }

  async function seriesBySuffix(
    service: MetricsService,
    labels: Record<string, string>,
    suffix: '_count' | '_sum',
  ): Promise<{ value?: number } | undefined> {
    const values = await histogramValues(service);

    return values.find(
      (value) =>
        value.metricName?.endsWith(suffix) === true &&
        Object.entries(labels).every(([key, label]) => value.labels[key] === label),
    );
  }

  async function histogramValues(
    service: MetricsService,
  ): Promise<{ labels: Record<string, string>; metricName?: string; value?: number }[]> {
    const histogram = service.registry.getSingleMetric('http_request_duration_seconds') as {
      get(): Promise<{
        values: { labels: Record<string, string>; metricName?: string; value?: number }[];
      }>;
    };
    const metric = await histogram.get();

    return metric.values;
  }
});
