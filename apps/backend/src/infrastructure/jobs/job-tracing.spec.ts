import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { context, propagation, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  TracerProvider,
} from '@opentelemetry/sdk-trace';
import { afterEach, describe, expect, it } from 'vitest';
import { captureJobTraceContext, runWithJobTraceContext, traceIdFromTraceContext } from './job-tracing.js';

/**
 * A real in-memory tracer provider, so capture/restore run against live
 * propagation instead of stubs. Confined to this file's vitest worker.
 */
const exporter = new InMemorySpanExporter();
const provider = new TracerProvider({ spanProcessors: [new SimpleSpanProcessor({ exporter })] });

context.setGlobalContextManager(new AsyncLocalStorageContextManager());
trace.setGlobalTracerProvider(provider);
// The API's default propagator is a no-op until the SDK registers the W3C one;
// the specs simulate the SDK here.
propagation.setGlobalPropagator(new W3CTraceContextPropagator());

describe('captureJobTraceContext', () => {
  afterEach(() => {
    exporter.reset();
  });

  it('returns nothing when no span is active (tracing off is a no-op)', () => {
    expect(captureJobTraceContext()).toBeUndefined();
  });

  it('serializes the active span as a W3C traceparent', async () => {
    const span = trace.getTracer('spec').startSpan('produce');

    await context.with(trace.setSpan(context.active(), span), () => {
      const traceparent = captureJobTraceContext();

      expect(traceparent).toBeDefined();
      expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
      expect(traceparent).toContain(span.spanContext().traceId);
    });

    span.end();
  });
});

describe('traceIdFromTraceContext', () => {
  it('extracts the trace id from a well-formed traceparent', () => {
    expect(traceIdFromTraceContext('00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01')).toBe(
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
  });

  it('rejects a malformed or absent context instead of guessing', () => {
    expect(traceIdFromTraceContext(undefined)).toBeUndefined();
    expect(traceIdFromTraceContext('not-a-traceparent')).toBeUndefined();
    expect(traceIdFromTraceContext('00-short-bbbbbbbbbbbbbbbb-01')).toBeUndefined();
  });
});

describe('runWithJobTraceContext', () => {
  afterEach(() => {
    exporter.reset();
  });

  it('runs the work inside a span for the job', async () => {
    const insideSpan = await runWithJobTraceContext(
      undefined,
      'sample.echo',
      { 'job.id': 'j1' },
      async () => {
        const active = trace.getSpan(context.active());

        return active?.spanContext().traceId;
      },
    );

    expect(insideSpan).toBeDefined();

    const [jobSpan] = exporter.getFinishedSpans();
    expect(jobSpan.name).toBe('job sample.echo');
    expect(jobSpan.attributes['job.type']).toBe('sample.echo');
    expect(jobSpan.attributes['job.id']).toBe('j1');
  });

  it('links the execution span to the producing span when a trace context rides the envelope', async () => {
    const producer = trace.getTracer('spec').startSpan('http request');
    const producerTraceId = producer.spanContext().traceId;
    let traceparent: string | undefined;

    await context.with(trace.setSpan(context.active(), producer), () => {
      traceparent = captureJobTraceContext();
    });
    producer.end();

    await runWithJobTraceContext(traceparent, 'sample.echo', {}, async () => undefined);

    const jobSpan = exporter.getFinishedSpans().find((span) => span.name === 'job sample.echo');

    expect(jobSpan).toBeDefined();
    expect(jobSpan?.links.length).toBe(1);
    expect(jobSpan?.links[0].context.traceId).toBe(producerTraceId);
  });

  it('marks the span failed when the work throws, and rethrows', async () => {
    await expect(
      runWithJobTraceContext(undefined, 'sample.echo', {}, async () => {
        throw new Error('job exploded');
      }),
    ).rejects.toThrow('job exploded');

    const [jobSpan] = exporter.getFinishedSpans();
    expect(jobSpan.name).toBe('job sample.echo');
    expect(jobSpan.status.code).toBe(2); // ERROR
    expect(jobSpan.events.some((event) => event.name === 'exception')).toBe(true);
  });

  it('runs the work (without a link) when the serialized context is malformed', async () => {
    const traceId = await runWithJobTraceContext(
      'not-a-traceparent',
      'sample.echo',
      {},
      async () => {
        return trace.getSpan(context.active())?.spanContext().traceId;
      },
    );

    expect(traceId).toBeDefined();

    const jobSpan = exporter.getFinishedSpans().at(-1);
    expect(jobSpan?.links.length ?? 0).toBe(0);
  });
});
