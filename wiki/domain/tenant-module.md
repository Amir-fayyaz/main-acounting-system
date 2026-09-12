# Tenant Module — Domain Specification

## 1. Purpose

This document defines the domain model of the `tenants` bounded context. It
serves as the authoritative reference for the Tenant aggregate root, its value
objects, domain events, and the boundaries between this module and adjacent
contexts (`subscriptions`, `accounting`, `identity`).

---

## 2. Bounded Context Boundaries

```text
┌─────────────────────────────────────────────────────────────────┐
│                         tenants                                 │
│                                                                 │
│  Aggregate: Tenant                                              │
│  Value Objects: ShopName, TaxInfo, Currency, TenantStatus,      │
│                 InventoryValuationMethod, SubscriptionPlan       │
│  Events: TenantCreatedDomainEvent, TenantStatusChanged,         │
│          TenantDeactivatedEvent, TenantValuationMethodChanged    │
└────────────────────┬──────────────────────────┬─────────────────┘
                     │                          │
          reads/writes identity             reads subscriptions
          via TenantId                      via SubscriptionPlan
                     │                          │
        ┌────────────▼──────┐      ┌────────────▼──────────┐
        │    identity       │      │   subscriptions        │
        │  (User ↔ Tenant)  │      │  (Plan ↔ Tenant)      │
        └───────────────────┘      └────────────────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │      accounting          │
        │  (Tenant as financial    │
        │   identity for invoices) │
        └──────────────────────────┘
```

Key rules:

- The `tenants` module owns the **legal & financial identity** of a shop.
- Other modules reference tenants only via `TenantId`, never by direct import
  of the aggregate.
- `SubscriptionPlan` is a value object carried by the Tenant aggregate; the
  dedicated `subscriptions` module manages plan lifecycle and billing.

---

## 3. Aggregate Root — Tenant

`Tenant` extends `AggregateRoot<TenantId>` and is the consistency boundary
for all shop-owned identity and configuration.

### 3.1 Creation

```
Tenant.create({
  id, shopName, taxInfo, baseCurrency, subscriptionPlan?
})
```

- Defaults: `valuationMethod` = FIFO, `subscriptionPlan` = FREE, `status` =
  ACTIVE.
- Raises `TenantCreatedDomainEvent`.

### 3.2 Reconstitution

```
Tenant.reconstitute({
  id, shopName, taxInfo, baseCurrency,
  valuationMethod, subscriptionPlan, status
})
```

Used by the persistence adapter; does **not** raise creation events.

### 3.3 Domain Methods

| Method                        | Guard         | Event raised                              |
| ----------------------------- | ------------- | ----------------------------------------- |
| `suspend(reason)`             | ACTIVE only   | TenantStatusChanged (→ SUSPENDED)         |
| `reactivate()`                | SUSPENDED / DEACTIVATED | TenantStatusChanged (→ ACTIVE)  |
| `deactivate()`                | not DEACTIVATED | TenantStatusChanged + TenantDeactivated |
| `updateTaxInfo(taxInfo)`      | ACTIVE only   | —                                         |
| `changeValuationMethod(m)`    | ACTIVE only   | TenantValuationMethodChanged              |
| `upgradePlan(plan)`           | ACTIVE only   | — (plan must be PAID)                     |

---

## 4. Value Objects

### 4.1 TaxInfo

Legal tax identity required for official financial invoicing.

| Field       | Type     | Validation                             |
| ----------- | -------- | -------------------------------------- |
| legalName   | string   | Non-empty, trimmed, max 100 chars      |
| nationalId  | string   | Exactly 10 numeric digits              |

Created via `TaxInfo.of({ legalName, nationalId })`.

### 4.2 Currency

Immutable base currency for the tenant's books. Never changes after creation.

| Validation                                       |
| ------------------------------------------------ |
| Uppercase ISO 4217 alpha-3 code                  |
| Must be in the accepted set: IRR, USD, EUR, GBP, AED |

### 4.3 TenantStatus

Lifecycle state of the tenant.

| Value         | Meaning                                    |
| ------------- | ------------------------------------------ |
| ACTIVE        | Normal operating state                     |
| SUSPENDED     | Temporarily suspended (e.g. unpaid billing)|
| DEACTIVATED   | Legacy deactivation (backward-compatible)  |
| ARCHIVED      | Permanent end-of-life (records preserved)  |

See [multi-tenancy.md §26](../architecture/multi-tenancy.md#26-tenantstatus-lifecycle)
for the full state machine.

### 4.4 ShopName

Display name of the shop. Trimmed, non-empty, max 100 characters.

### 4.5 InventoryValuationMethod

Tenant-level inventory cost method: `FIFO` (default) or `LIFO`. Applies
from the effective date forward; historical calculations are never rewritten
(BR-REPORT-002).

### 4.6 SubscriptionPlan

Platform-level commercial plan: `FREE` (default) or `PAID`. The only
enforced limit is an optional monthly invoice count on the FREE plan
(BR-SUB-001).

---

## 5. Domain Events

### 5.1 TenantCreatedDomainEvent

Raised once when a tenant is first created via `Tenant.create()`.

| Field          | Type     | Description                            |
| -------------- | -------- | -------------------------------------- |
| tenantId       | string   | The tenant identifier                  |
| legalName      | string   | Registered company name                |
| baseCurrency   | string   | ISO 4217 currency code                 |
| createdAt      | Date     | Timestamp of creation                  |

### 5.2 TenantStatusChangedDomainEvent

Raised on every lifecycle status transition (`suspend`, `reactivate`,
`deactivate`).

| Field           | Type     | Description                           |
| --------------- | -------- | ------------------------------------- |
| tenantId        | string   | The tenant identifier                 |
| previousStatus  | string   | Status before the transition          |
| newStatus       | string   | Status after the transition           |
| reason          | string   | Human-readable reason for the change |

### 5.3 TenantDeactivatedEvent

Legacy event raised alongside `TenantStatusChangedDomainEvent` when
`deactivate()` is called, for backward-compatible event consumers.

### 5.4 TenantValuationMethodChangedEvent

Raised when the inventory valuation method changes between FIFO and LIFO.

---

## 6. Repository Port

The application layer interacts with the Tenant aggregate through
`TenantRepositoryPort`:

```typescript
interface TenantRepositoryPort {
  save(tenant: Tenant): Promise<void>;
  findById(id: TenantId): Promise<Tenant | null>;
  existsByNationalId(nationalId: string): Promise<boolean>;
}
```

- `existsByNationalId` is used during tenant creation to enforce uniqueness.
- The TypeORM adapter (`TenantTypeOrmRepository`) implements this port.

---

## 7. Bounded Context Interaction Summary

| Consumer context  | What it needs from `tenants`        | How it accesses        |
| ----------------- | ----------------------------------- | ---------------------- |
| identity          | Tenant existence, status checks     | TenantId               |
| subscriptions     | Plan type, Tenant status            | TenantId, SubscriptionPlan |
| accounting        | TaxInfo, Currency, ShopName         | TenantId               |
| inventory         | Tenant-level valuation method       | TenantId               |
| sales / purchases | Tenant isolation, currency          | TenantId               |
