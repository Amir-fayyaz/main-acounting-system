import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

/**
 * The correlation id the global middleware assigned to this request (FND-006;
 * ADR-015).
 *
 * A handler that records a structured line or an audit fact needs the same id
 * the client sees in the error envelope, and it should not read the raw request
 * to get it: this decorator is the boundary vocabulary for that value, exactly
 * as `@CurrentPrincipal` is for the acting identity.
 *
 * The middleware always assigns one (a client-supplied `x-correlation-id` is
 * reused, otherwise one is generated), so the value is a real string for every
 * routed request; `undefined` only models a request that reached the handler
 * without the middleware, and the caller treats that as "no correlation".
 */
export const CorrelationId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string | undefined => {
    const request = context.switchToHttp().getRequest<{ correlationId?: string }>();
    return request.correlationId;
  },
);
