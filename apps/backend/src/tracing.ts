/**
 * The OpenTelemetry bootstrap (FND-015, 10-observability).
 *
 * Every process entry point (`main.ts`, `worker.ts`, `scheduler.ts`) imports
 * this file *first*, before any other import, as a side effect: the
 * auto-instrumentations patch the HTTP, MySQL, Redis and Express modules when
 * they are first required, so the SDK must be started before the framework —
 * and anything that requires them — is loaded. A late start would silently
 * miss every span created before it.
 *
 * What it wires, once per process:
 *
 * - `NodeSDK` with an `AsyncLocalStorageContextManager`, so the trace context
 *   flows the same way `LogContext`, `TenantScope` and the transaction
 *   boundary already do (`node:async_hooks`);
 * - auto-instrumentation for HTTP (server + client), Express and Nest
 *   (route spans), MySQL2 (Drizzle query durations) and Redis (job-queue and
 *   cache command latency);
 * - an OTLP/HTTP trace exporter pointed at the configured collector, so the
 *   spans leave the process for Tempo/Jaeger — the collector itself is
 *   external infrastructure and out of scope.
 *
 * Everything here is guarded by `TRACING_ENABLED`: when disabled the module
 * does nothing, the API stays at its no-op defaults and the application boots
 * exactly as it did before this file existed.
 */
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { MySQL2Instrumentation } from '@opentelemetry/instrumentation-mysql2';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis';
import { NodeSDK } from '@opentelemetry/sdk-node';
import type { SpanProcessor } from '@opentelemetry/sdk-trace';
import { loadDotEnvFiles } from './infrastructure/config/dotenv.js';
import { loadConfiguration } from './infrastructure/config/configuration.js';

/**
 * Test seam: an e2e test installs a `SpanProcessor` here (an in-memory one)
 * before importing this module, so it can read the spans the real
 * instrumentations produce without a running collector. Absent in production.
 */
const TEST_SPAN_PROCESSOR: unique symbol = Symbol.for('backend.otel.test-span-processor');

let startedSdk: NodeSDK | undefined;

/**
 * The instrumentation set of every process. Exposed for tests, so the
 * registration can be asserted without a collector or a live dependency.
 */
export function buildInstrumentations() {
  return [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new NestInstrumentation(),
    new MySQL2Instrumentation(),
    new RedisInstrumentation(),
  ];
}

/** The exporter for completed spans, or `undefined` when there is nowhere to send them. */
function buildExporter(endpoint: string, isTestRun: boolean): OTLPTraceExporter | undefined {
  if (isTestRun) {
    // A test reads spans through its own processor; exporting to a local
    // collector that is not running would only produce connection-failure
    // noise for the whole run.
    return undefined;
  }

  // The OTLP/HTTP exporter posts to `<endpoint>/v1/traces`; a collector
  // address given without the signal path is completed automatically.
  const url = endpoint.endsWith('/v1/traces')
    ? endpoint
    : `${endpoint.replace(/\/$/, '')}/v1/traces`;

  return new OTLPTraceExporter({ url });
}

function bootstrapTracing(): void {
  // Dotenv is loaded here, not only in the entry points, because this module
  // runs before anything else: without the files' values the tracing
  // configuration would be read from a not-yet-merged environment. Loading is
  // idempotent, and the entry points repeat it harmlessly.
  loadDotEnvFiles();
  const configuration = loadConfiguration();

  if (!configuration.tracing.enabled) {
    return;
  }

  const testProcessor = (globalThis as Record<symbol, unknown>)[TEST_SPAN_PROCESSOR] as
    SpanProcessor | undefined;
  const exporter = buildExporter(
    configuration.tracing.exporterEndpoint,
    testProcessor !== undefined,
  );

  const sdk = new NodeSDK({
    contextManager: new AsyncLocalStorageContextManager(),
    ...(testProcessor !== undefined ? { spanProcessors: [testProcessor] } : {}),
    ...(exporter !== undefined ? { traceExporter: exporter } : {}),
    instrumentations: buildInstrumentations(),
  });

  sdk.start();
  startedSdk = sdk;

  // A BatchSpanProcessor holds completed spans for a few seconds; a graceful
  // SIGTERM must flush them to the collector instead of losing the last
  // requests' worth of trace data.
  const flush = (): void => {
    void startedSdk?.shutdown();
  };

  process.once('SIGTERM', flush);
  process.once('SIGINT', flush);
}

/** Shuts the SDK down (flushing the exporter); safe when tracing never started. */
export async function shutdownTracing(): Promise<void> {
  await startedSdk?.shutdown();
  startedSdk = undefined;
}

bootstrapTracing();
