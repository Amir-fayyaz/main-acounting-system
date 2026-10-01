# 14 — Background Jobs

How the background-job infrastructure of FND-007 is applied. The decisions are in
ADR-008 and TECH-011; this document describes the implementation so a module can
add a job without inventing its own queue, retry or idempotency rules.

## Scope

Applies to every long-running or asynchronous operation — imports, file
processing, reconciliation, reports, agent execution, notifications and
integrations. The infrastructure is shared; a business job belongs to its owning
module and never to the infrastructure.

## Runtime

```text
Web / REST API   enqueues jobs, never runs them in the request
Worker           consumes and executes
Scheduler        enqueues periodic work and promotes due retries
Redis            Queue / Job Infrastructure (never a source of truth, TECH-007)
MySQL            durable business data, owned by the module
```

`apps/backend` is one workspace package with three entry points:
`dist/main.js` (API), `dist/worker.js` (Worker) and `dist/scheduler.js`
(Scheduler). All three load the same configuration from FND-003.

## Queue abstraction

- Port: `infrastructure/jobs/queue/job-queue.port.ts` (`JobQueuePort`).
- Adapter: `infrastructure/jobs/queue/redis-job-queue.ts`, using **Redis
  Streams** with a consumer group (ADR-008 section 1, ADR-005 section 7).
- Streams are used because they persist and can be replayed, which Pub/Sub
  cannot. A consumer group delivers each envelope to one Worker at a time and
  keeps it pending until acknowledged, so a Worker crash leaves work reclaimable.
- The queue never interprets a payload, so a new job type never needs a queue
  change.

Keys are namespaced by environment (`jobs:<environment>:…`), so a development
Worker and a test run sharing one Redis never consume each other's jobs.

## Job contract

`JobEnvelope` carries: `jobId`, `type`, `version`, `payload`, `attempt`,
`maxAttempts`, `correlationId`, optional `companyId`, `createdAt` and
`enqueuedBy`. A `JobRecord` adds `status`, `startedAt`, `completedAt` and
`lastError`.

`companyId` is the tenant/owner context of ADR-008 section 12. It is optional at
this stage because no business job exists yet; a domain job sets it and the
infrastructure carries it through untouched.

## Defining and registering a job

```ts
export const postInvoiceJob = defineJob<PostInvoicePayload>({
  type: 'sales.post-invoice',
  maxAttempts: 5,
  idempotencyKey: (payload) => `sales.post-invoice:${payload.invoiceId}`,
  async execute(context) {
    // context: jobId, type, attempt, maxAttempts, correlationId, companyId,
    // payload, signal, logger, idempotency
  },
});
```

Register it in `JOB_DEFINITIONS` (currently `sample/sample-jobs.ts` in
`JobsModule`). A duplicate type name is rejected at startup. The Worker resolves
every claimed envelope through `JobRegistry`; an unregistered type becomes a
terminal failure, not a crash.

## Lifecycle

```text
queued → running → completed
                 → retrying → running (next attempt)
                 → failed   (terminal, needs a human)
```

Every transition is written to the job's state record, and the stream entry is
acknowledged only after the state is written. A failure is never hidden: a
terminal job keeps a `failed` record with its last error and category.

## Retry

- Only an explicit `RetryableJobError` is retried (`job.errors.ts`).
- A `TerminalJobError` is never retried.
- An unexpected error is classified `unknown` and is **not** retried, because the
  infrastructure must not assume an operation it did not understand is safe to
  repeat (ADR-004 section 12).
- The attempt budget is `jobs.maxAttempts`, and the delay grows exponentially
  (`jobs.retryBaseDelayMs`, doubling) capped at `jobs.retryMaxDelayMs`, with
  50–100% jitter so failures do not retry in lockstep.
- When the budget is exhausted the job is parked as `failed` — the dead-letter /
  needs-review state of ADR-008 section 7.

## Idempotency

A definition may declare an `idempotencyKey`. The dispatcher claims the key
(`SET NX EX`) before executing and, if it is already claimed by a completed
execution, skips the duplicate delivery. The claim is released when an attempt
fails, so a retry can run; it is kept after success, so a repeated delivery of a
completed job is a no-op. Whether a *partially* executed attempt is safe to
repeat is a domain decision the job's key expresses — the infrastructure does not
guess.

## Observability hooks

Each execution emits one structured JSON log line with `jobId`, `type`,
`attempt`, `maxAttempts`, `correlationId`, `status`, `durationMs`, the failure
category and any detail. Failure messages are redacted through the application
secret redactor. This is the data a later metrics/tracing layer reads; metrics,
queue-depth reporting and alerting are out of scope here.

## Scheduler

- Enqueues periodic triggers defined as `ScheduledJobDefinition`; it never
  executes a job and is never the source of truth.
- Claims a Redis slot per schedule (`SET NX PX <interval>`), so a restart or a
  second instance cannot double-enqueue a tick.
- Also promotes retries whose backoff has elapsed. The Worker promotes them too,
  so retries progress even when the Scheduler is not running; an entry is claimed
  atomically, so running both is safe.

## Crash recovery

A Worker that dies before acknowledging leaves its entry in the consumer group's
pending list. `reclaimStale` (`XAUTOCLAIM`, older than the visibility timeout)
takes it over so the work is retried instead of lost (ADR-004 section 23).

## Configuration

All through the centralized configuration (FND-003); no process reads the
environment itself.

| Variable                     | Default | Meaning                                  |
| ---------------------------- | ------- | ---------------------------------------- |
| `WORKER_CONCURRENCY`         | 4       | Jobs one Worker executes at a time       |
| `WORKER_MAX_ATTEMPTS`        | 3       | Attempts before a job is parked          |
| `WORKER_RETRY_BASE_DELAY_MS` | 1000    | First backoff; doubles per attempt       |
| `WORKER_RETRY_MAX_DELAY_MS`  | 30000   | Backoff ceiling                          |
| `SCHEDULER_INTERVAL_MS`      | 1000    | Scheduler tick (promote + periodic check) |

## Local development

```bash
pnpm infra:up                                   # Redis (and MySQL/MinIO)
pnpm --filter @accounting-saas/backend build    # or use the dev:* watch scripts

# Processes (each in its own terminal)
SERVICE_NAME=worker    pnpm --filter @accounting-saas/backend start:worker
SERVICE_NAME=scheduler pnpm --filter @accounting-saas/backend start:scheduler

# Enqueue a sample job
pnpm --filter @accounting-saas/backend job:enqueue sample.echo '{"message":"hi"}'
pnpm --filter @accounting-saas/backend job:enqueue sample.retry-then-succeed '{"succeedOnAttempt":3}'
pnpm --filter @accounting-saas/backend job:enqueue sample.retry-exhausted
pnpm --filter @accounting-saas/backend job:enqueue sample.terminal-failure
```

Watch scripts: `dev:worker` and `dev:scheduler` (Nest `--entryFile`).
`REDIS_INTEGRATION=1` additionally runs the Redis-backed integration tests.

## What a new module does

1. Define the job with `defineJob<Payload>` and a namespaced type.
2. Register it in `JobsModule` (or in a module that exports its definitions).
3. Enqueue it through `JobEnqueuer` from a use case — never run long work inline
   in a request.
4. Set `companyId`, and an idempotency key when a repeated delivery could repeat
   an effect.
5. Keep the job's logic in the owning module; the queue stays generic.

## Out of scope here

Business-domain jobs, production scaling, distributed orchestration, Kafka or
RabbitMQ, business retry/scheduling rules, and durable business-visible job
history (a module adds that when it needs it).
