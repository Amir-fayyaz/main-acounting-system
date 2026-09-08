/**
 * Public domain exports for the shared kernel. Business modules should import
 * shared domain primitives from this entry point only.
 */
export { AggregateRoot } from './aggregate-root';
export { DomainEvent } from './domain-event';
export { TenantDomainEvent } from './events/tenant-domain-event';
export { DomainError } from './domain.error';
export { InvalidStateError } from './invalid-state.error';
export { InvalidValueError } from './invalid-value.error';
export { NotFoundError } from './errors/not-found.error';
export { ConflictError } from './errors/conflict.error';
export { ValidationError } from './errors/validation.error';
export { UnauthorizedError } from './errors/unauthorized.error';
export { Entity } from './entity';
export { ErrorCode } from './error-codes';
export type { ErrorCode as ErrorCodeType } from './error-codes';
export { Money } from './money';
export { Quantity } from './quantity';
export { CLOCK, Clock } from './providers/clock.provider';
export { ID_GENERATOR, IdGenerator } from './providers/id-generator.provider';
