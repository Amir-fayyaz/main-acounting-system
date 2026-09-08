/**
 * Public entry point for the DDD + hexagonal building-blocks package.
 * Framework-free: safe to import from domain, application, and
 * infrastructure layers of any TypeScript backend.
 */

// Domain building blocks
export { Entity } from './domain/entity';
export { AggregateRoot } from './domain/aggregate-root';
export type { DomainEvent } from './domain/domain-event';
export { ValueObject } from './domain/value-object';

// Domain errors
export { DomainError } from './domain/errors/domain.error';
export { InvalidValueError } from './domain/errors/invalid-value.error';
export { InvalidStateError } from './domain/errors/invalid-state.error';
export { NotFoundError } from './domain/errors/not-found.error';
export { ConflictError } from './domain/errors/conflict.error';
export { ValidationError } from './domain/errors/validation.error';
export { UnauthorizedError } from './domain/errors/unauthorized.error';

// Generic value objects
export { Money } from './domain/value-objects/money';
export { Quantity } from './domain/value-objects/quantity';

// Domain ports (driven)
export { CLOCK } from './domain/ports/clock.port';
export type { Clock } from './domain/ports/clock.port';
export { ID_GENERATOR } from './domain/ports/id-generator.port';
export type { IdGenerator } from './domain/ports/id-generator.port';
export { EVENT_PUBLISHER } from './domain/ports/event-publisher.port';
export type { EventPublisher } from './domain/ports/event-publisher.port';

// Application building blocks
export { Command } from './application/command';
export { Query } from './application/query';
export type { UseCase } from './application/use-case';
export { ok, fail, isOk, isFail, map, flatMap, unwrap } from './application/result';
export type { Result } from './application/result';

// Application ports (driven)
export type { OutboxMessage, OutboxPort } from './application/ports/outbox.port';
export { UNIT_OF_WORK } from './application/ports/unit-of-work.port';
export type { UnitOfWork } from './application/ports/unit-of-work.port';
export { PASSWORD_HASHER } from './application/ports/password-hasher.port';
export type { PasswordHasher } from './application/ports/password-hasher.port';
export { TOKEN_PROVIDER } from './application/ports/token-provider.port';
export type { TokenPayload, TokenProvider } from './application/ports/token-provider.port';
export type { Persistable, RepositoryPort } from './application/ports/repository.port';

// Reference adapters (infrastructure)
export { SystemClock } from './adapters/system-clock';
export { UuidIdGenerator } from './adapters/uuid-id-generator';
