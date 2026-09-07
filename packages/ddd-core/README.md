# @accounting-saas/ddd-core

Framework-free DDD & hexagonal architecture building blocks for TypeScript
backends. Zero runtime dependencies; safe to import from any layer.

## What's inside

### Domain layer

| Building block | File | Purpose |
| --- | --- | --- |
| `Entity<TId>` | `domain/entity.ts` | Base class for entities; equality by identity. |
| `AggregateRoot<TId>` | `domain/aggregate-root.ts` | Entity that is the consistency boundary; collects domain events. |
| `DomainEvent` | `domain/domain-event.ts` | Contract for past-tense facts (`occurredAt`, `eventName`). |
| `ValueObject` | `domain/value-object.ts` | Base class for immutable values; structural equality. |
| `Money`, `Quantity` | `domain/value-objects/` | Ready-made value objects (minor-unit integer money, positive quantity). |
| `DomainError` (+ `InvalidValueError`, `InvalidStateError`) | `domain/errors/` | Error hierarchy carrying a stable machine-readable `code`. |

### Domain ports (driven)

Interfaces plus framework-agnostic injection tokens (symbols) so the domain
never depends on a container:

- `Clock` / `CLOCK`
- `IdGenerator` / `ID_GENERATOR`
- `EventPublisher` / `EVENT_PUBLISHER`

### Application layer

- `Command`, `Query` — marker base classes for CQRS intents (`instanceof`-dispatchable).
- `UseCase<TInput, TOutput>` — one-operation application service contract.
- `Result<T, E>` + `ok` / `fail` / `isOk` / `isFail` — explicit outcome handling.
- `UnitOfWork` / `UNIT_OF_WORK`, `OutboxPort` + `OutboxMessage` — application-owned
  outbound ports for transactions and reliable event delivery.

### Reference adapters (infrastructure)

- `SystemClock` implements `Clock`.
- `UuidIdGenerator` implements `IdGenerator` (UUID v4 via `node:crypto`).

## Usage

```ts
import {
  AggregateRoot,
  DomainEvent,
  InvalidStateError,
  Money,
  ID_GENERATOR,
  IdGenerator,
} from '@accounting-saas/ddd-core';

class InvoiceConfirmed implements DomainEvent {
  readonly eventName = 'InvoiceConfirmed';
  readonly occurredAt = new Date();
  constructor(public readonly invoiceId: string) {}
}

class Invoice extends AggregateRoot<string> {
  private constructor(
    id: string,
    private total: Money,
    private confirmed: boolean,
  ) {
    super(id);
  }

  static issue(id: string, total: Money): Invoice {
    return new Invoice(id, total, false);
  }

  confirm(): void {
    if (this.confirmed) throw new InvalidStateError('Invoice already confirmed');
    this.confirmed = true;
    this.addDomainEvent(new InvoiceConfirmed(this.id));
  }
}

// The aggregate carries its events; the use case saves it and publishes.
const invoice = Invoice.issue('inv-1', Money.of(1250n, 'USD'));
invoice.confirm();
const events = invoice.getDomainEvents();
// ...events are dispatched, then:
invoice.clearEvents();
```

### Ports in a NestJS backend

Ports are interfaces + symbols, so any DI container can bind them:

```ts
import { CLOCK, SystemClock } from '@accounting-saas/ddd-core';

@Module({
  providers: [
    { provide: CLOCK, useClass: SystemClock },
    // { provide: ID_GENERATOR, useClass: UuidIdGenerator },
  ],
  exports: [CLOCK],
})
export class SharedKernelModule {}
```

## Scripts

```bash
pnpm build          # tsc -> dist/
pnpm typecheck      # tsc --noEmit
pnpm test           # jest, unit specs
pnpm format:check   # prettier
```

## Publishing

The package is workspace-private (`"private": true`). To publish it later,
remove the flag, bump the version, and run `pnpm publish` from this directory.
