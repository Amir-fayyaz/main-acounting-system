import { context, propagation, trace, type Context, type Span } from '@opentelemetry/api';

/**
 * Trace-context propagation for background jobs (FND-015).
 *
 * A job crosses a process boundary (Redis stream), so its span relationship
 * cannot ride the ambient `AsyncLocalStorage` — it must be serialized into the
 * envelope and rebuilt on the other side:
 *
 * - the **producer** (any process that enqueues) captures the W3C `traceparent`
 *   of its current span into the envelope;
 * - the **Worker** extracts it and starts the execution span *linked* to it —
 *   a link, not a parent, because the producing span has long ended by the time
 *   the job runs and the execution belongs to its own trace of work.
 *
 * The helpers only use `@opentelemetry/api`, so with tracing disabled they are
 * no-ops that never throw: `capture` yields nothing and `runWith` still runs
 * the work.
 */

/** The envelope field that carries the serialized span context. */
export const JOB_TRACE_CONTEXT_FIELD = 'traceContext';

/**
 * Serializes the current span context into a W3C `traceparent`, or `undefined`
 * when no span is active (tracing off, or a system path with no request).
 */
export function captureJobTraceContext(): string | undefined {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);

  const traceparent = carrier['traceparent'];

  return traceparent !== undefined && traceparent !== '' ? traceparent : undefined;
}

/**
 * Runs `work` inside a span for one job execution.
 *
 * `traceContext` (the producer's `traceparent`, when it had one) is attached as
 * a **link** on the new span, so the execution is traceable back to the request
 * that triggered it without pretending the producing span is still open. The
 * span records the job's identity (never its payload), carries the failure to
 * the span status, and always ends — a throwing handler cannot leak it.
 */
export function runWithJobTraceContext<T>(
  traceContext: string | undefined,
  jobType: string,
  jobAttributes: Readonly<Record<string, string | number>>,
  work: () => Promise<T>,
): Promise<T> {
  const parent = extractParentContext(traceContext);
  const parentSpan = parent !== undefined ? trace.getSpan(parent) : undefined;
  const links = parentSpan !== undefined ? [{ context: parentSpan.spanContext() }] : [];
  const tracer = trace.getTracer('backend.jobs');

  const callback = async (span: Span): Promise<T> => {
    span.setAttributes({ 'job.type': jobType, ...jobAttributes });

    try {
      const result = await work();
      span.end();

      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2 /* ERROR */ });
      span.end();
      throw error;
    }
  };

  return parent !== undefined
    ? tracer.startActiveSpan(`job ${jobType}`, { links }, callback)
    : tracer.startActiveSpan(`job ${jobType}`, callback);
}

/** The context the producer's `traceparent` points at, or `undefined` when absent/unparseable. */
function extractParentContext(traceContext: string | undefined): Context | undefined {
  if (traceContext === undefined) {
    return undefined;
  }

  try {
    const extracted = propagation.extract(context.active(), { traceparent: traceContext });

    return trace.getSpan(extracted) !== undefined ? extracted : undefined;
  } catch {
    // A malformed header is a lost link, never a lost job.
    return undefined;
  }
}
