import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { context, propagation, trace, type ContextManager } from '@opentelemetry/api';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  TracerProvider,
} from '@opentelemetry/sdk-trace';
import { afterEach, describe, expect, it } from 'vitest';
import { correlationIdMiddleware, resolveCorrelationId } from './correlation-id.js';

/**
 * A real in-memory tracer provider, so the resolution runs against a *live*
 * trace context instead of a stub. The global registration is confined to this
 * file's vitest worker.
 */
const exporter = new InMemorySpanExporter();
const provider = new TracerProvider({
  spanProcessors: [new SimpleSpanProcessor({ exporter })],
});

context.setGlobalContextManager(new AsyncLocalStorageContextManager() as ContextManager);
trace.setGlobalTracerProvider(provider);
// The API's default propagator is a no-op until the SDK registers the W3C one;
// the specs simulate the SDK here.
propagation.setGlobalPropagator(new W3CTraceContextPropagator());

describe('resolveCorrelationId', () => {
  afterEach(() => {
    exporter.reset();
  });

  it('accepts a safe, bounded caller header', () => {
    expect(resolveCorrelationId('client-id-1')).toBe('client-id-1');
    expect(resolveCorrelationId(['first', 'second'])).toBe('first');
  });

  it('rejects unsafe or oversized caller headers instead of echoing them', () => {
    expect(resolveCorrelationId('bad id injection')).toBeUndefined();
    expect(resolveCorrelationId('x'.repeat(129))).toBeUndefined();
  });

  it('returns nothing when no trace context is active (the caller generates an id)', () => {
    expect(resolveCorrelationId(undefined)).toBeUndefined();
  });

  it('uses the active trace id, so logs and traces carry the same value', async () => {
    const tracer = trace.getTracer('spec');
    const span = tracer.startSpan('request');

    await context.with(trace.setSpan(context.active(), span), () => {
      expect(resolveCorrelationId(undefined)).toBe(span.spanContext().traceId);
      // A caller-supplied id still wins: it is an explicit upstream intent.
      expect(resolveCorrelationId('caller-id')).toBe('caller-id');
    });

    span.end();
    expect(exporter.getFinishedSpans().length).toBe(1);
  });
});

describe('correlationIdMiddleware', () => {
  it('generates a UUID when neither a header nor a trace is available', () => {
    const request: { headers: Record<string, string>; correlationId?: string } = {
      headers: {},
    };
    const echoed: string[] = [];
    const response = {
      setHeader: (_name: string, value: string) => {
        echoed.push(value);
      },
    };

    correlationIdMiddleware(request, response, () => {
      expect(request.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    expect(echoed).toEqual([request.correlationId]);
  });

  it('assigns the trace id of the active span when no header is supplied', async () => {
    const tracer = trace.getTracer('spec');
    const span = tracer.startSpan('request');
    const request: { headers: Record<string, string>; correlationId?: string } = {
      headers: {},
    };
    const echoed: string[] = [];
    const response = { setHeader: (_name: string, value: string) => void echoed.push(value) };

    await context.with(trace.setSpan(context.active(), span), () => {
      correlationIdMiddleware(request, response, () => {
        expect(request.correlationId).toBe(span.spanContext().traceId);
      });
    });

    span.end();
    expect(echoed).toEqual([request.correlationId]);
  });

  it('runs the rest of the request inside a LogContext scope carrying the id', () => {
    const request: { headers: Record<string, string>; correlationId?: string } = {
      headers: { 'x-correlation-id': 'known-id' },
    };
    const response = { setHeader: () => undefined };
    let seen: string | undefined;

    correlationIdMiddleware(request, response, () => {
      seen = request.correlationId;
    });

    expect(seen).toBe('known-id');
  });
});
