# Integration Architecture

## 1. Purpose

This document defines how the platform interacts with external services and isolates those dependencies from the business domain.

## 2. Integration Principle

External providers are infrastructure concerns.

Business modules should depend on internal interfaces/contracts rather than directly importing provider SDKs.

Conceptually:

```text
Business Module
      ↓
Internal Port / Interface
      ↓
Infrastructure Adapter
      ↓
External Provider
```

## 3. Current External Integration Candidates

### Messaging

Used for verification codes, notifications, reminders, and potentially invoice delivery.

### Email

Used for future notifications or document delivery where required.

### File Storage

Used for invoice/PDF files and potentially shop assets such as logos.

### Payment Gateway

Not required by the current MVP requirements. It remains a future integration candidate.

## 4. Integration Contract

Each external integration should define:

- Purpose
- Input contract
- Output contract
- Authentication method
- Failure behavior
- Retry behavior
- Timeout policy
- Idempotency expectations
- Observability
- Security/privacy considerations

## 5. Failure Isolation

Temporary provider failures must not corrupt authoritative business state.

Examples:

```text
Invoice successfully confirmed
        ↓
Invoice is authoritative
        ↓
SMS delivery fails
        ↓
Business transaction remains valid
        ↓
Delivery may be retried asynchronously
```

## 6. Timeouts and Retries

External integrations must use explicit timeout and retry policies rather than relying on indefinite network calls.

Retry behavior must be safe for repeated execution.

## 7. Sensitive Credentials

Provider credentials must never be stored in source code.

They must be supplied through the deployment environment's secret-management mechanism.

## 8. Tenant Context

Whenever an integration is triggered by tenant-owned work, the internal job/event context must preserve tenant identity.

External providers themselves should not be treated as the source of tenant authorization.

## 9. Webhooks / Callbacks

If external providers introduce callbacks in the future, callback handling must:

1. Authenticate/verify the callback.
2. Resolve the relevant business operation.
3. Resolve tenant context from trusted internal data.
4. Apply an idempotent state transition.
5. Record the relevant audit/integration event.

## 10. Open Decisions

- Messaging provider
- Email provider
- File storage provider
- Payment provider, if introduced
- Webhook strategy
- Provider-specific retry/dead-letter policy
- Integration monitoring

The application must isolate integrations behind ports and adapters. External
provider SDKs must not be imported by domain or application business code.
