# Transaction and Consistency Architecture

## 1. Purpose

This document defines how business operations that affect multiple pieces of state must preserve consistency.

## 2. Business Transaction

A business transaction represents one logical operation from the user's perspective.

Examples:

- Completing a sale
- Completing a purchase
- Recording a payment
- Processing a return

The system must define which state changes belong to the same atomic operation.

## 3. Atomicity

When a single business operation changes multiple authoritative records, partial success must not leave the system in an invalid state.

Example:

```text
Sale Confirmation
 ├── Invoice state
 ├── Invoice items
 ├── Inventory effect
 ├── Payment / receivable effect
 └── Audit record
```

The exact atomic boundary will be finalized per workflow.

## 4. Inventory Consistency

Inventory changes must be coupled to the business event that causes them.

A completed sale must not persist successfully while its required inventory effect silently fails.

The final model must define how inventory movements and current stock remain consistent.

## 5. Financial Consistency

Customer, supplier, cash, and bank effects must be consistent with their originating business transactions.

The architecture must also preserve a future path to double-entry accounting.

## 6. Idempotency

Operations that may be retried must define whether they are idempotent.

This is especially important for:

- External callbacks
- Background jobs
- Payment-related operations
- Notification-triggering operations
- Network retries

The exact idempotency-key strategy remains TBD.

## 7. Concurrency

The system must consider concurrent operations on shared state such as:

- Inventory quantity
- Cash balances
- Invoice state
- Shop configuration

The implementation must prevent race conditions from violating business invariants.

## 8. State Transitions

Important business entities should have explicit legal state transitions.

Example:

```text
Draft → Confirmed → Paid / PartiallyPaid / Credit
                     ↓
                 Returned
```

The exact states and transitions will be defined in domain/workflow documents.

## 9. External Side Effects

External side effects such as SMS, email, file generation, or payment-provider calls should not create inconsistent business state merely because the provider is temporarily unavailable.

The exact outbox/retry strategy is TBD.

## 10. Consistency Model

The default goal for core business state is strong consistency within the business transaction boundary.

Asynchronous processing may be used for secondary side effects where temporary delay is acceptable.

## 11. MVP Decisions

- Sale confirmation, inventory movements, payments, and balance projections
  are one database transaction.
- Events that describe a committed business change are recorded through a
  transactional outbox.
- Consumers must be idempotent and may process an event more than once.
- Every event and job includes `tenant_id`, correlation ID, unique event ID,
  and schema version.
- External delivery, reporting, and notifications cannot roll back the core
  business transaction.

## 12. Open Decisions

- Database isolation level
- Locking strategy
- Optimistic vs. pessimistic concurrency
- Idempotency mechanism
- Outbox/event strategy
- Retry and compensation rules
