import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type HttpException,
  type NestInterceptor,
} from '@nestjs/common';
import { catchError, tap, throwError, type Observable } from 'rxjs';
import { MetricsService } from './metrics.service.js';

/** The request subset the interceptor reads (express-shaped, no express import). */
interface MetricRequest {
  readonly method: string;
  readonly route?: { readonly path?: string };
}

/** The response subset the interceptor reads. */
interface MetricResponse {
  statusCode?: number;
}

/** Label for a request that matched no registered route (404s and alike). */
const UNMATCHED_ROUTE = 'unmatched';

/** A route pattern of the matched route is already the label; raw URLs are never. */
interface RoutedRequest extends MetricRequest {
  readonly route?: { readonly path: string };
}

/**
 * Times every HTTP request for Prometheus (FND-014).
 *
 * Registered globally in `bootstrap.ts` — like the other API conventions — so
 * no controller opts in or out. For each request it observes
 * `http_request_duration_seconds` with three low-cardinality labels:
 *
 * - `method`: the HTTP verb;
 * - `route`: the **matched route pattern** (`/api/v1/examples/:id`), read from
 *   the router after the handler ran — never the raw URL, so a thousand
 *   different ids cannot create a thousand time series (cardinality explosion);
 *   a request that matched no route is reported as `unmatched`;
 * - `status_code`: the response status the handler (or the exception filter)
 *   produced. A failure is observed through the error path of the handler
 *   stream: an `HttpException` contributes its own status, anything else is a
 *   500 — and the error is always re-thrown so the global exception filter
 *   keeps building the standard error contract (FND-006).
 *
 * Observing must never fail a request: the interceptor records around the
 * handler and passes every outcome through untouched.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Partial<MetricRequest>>();

    if (request.method === undefined) {
      // Not an HTTP context; the metric has no meaning there.
      return next.handle();
    }

    const startedAtMs = performance.now();
    const finish = (statusCode: number): void => {
      this.metrics.observeHttpRequest(
        request.method as string,
        routeLabel(request as RoutedRequest),
        statusCode,
        (performance.now() - startedAtMs) / 1000,
      );
    };

    const response = httpContext.getResponse<MetricResponse>();

    return next.handle().pipe(
      tap(() => {
        finish(response.statusCode ?? 200);
      }),
      catchError((error: unknown) => {
        finish(statusOf(error, response));
        return throwError(() => error);
      }),
    );
  }
}

/** The matched route pattern, or `unmatched` when the router has none. */
function routeLabel(request: RoutedRequest): string {
  return request.route?.path ?? UNMATCHED_ROUTE;
}

/** The status an exception maps to, or the response's own status as fallback. */
function statusOf(error: unknown, response: MetricResponse): number {
  if (isHttpException(error)) {
    return error.getStatus();
  }

  const responseStatus = response.statusCode ?? 200;

  return responseStatus >= 400 ? responseStatus : 500;
}

/** Structural check, so a non-Nest error still falls through to the 500 path. */
function isHttpException(error: unknown): error is HttpException {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as HttpException).getStatus === 'function'
  );
}
