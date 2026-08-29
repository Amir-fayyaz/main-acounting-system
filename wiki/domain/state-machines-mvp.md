# MVP State Machines

## 1. Sales Invoice

```text
Draft (future)
   ↓
Confirmed ──→ Reversed
   ↓
Partially Returned ──→ Fully Returned
```

For the MVP, new sales are confirmed during creation. A confirmed invoice is
immutable. Return or reversal creates a linked document.

## 2. Purchase Invoice

```text
Confirmed ──→ Reversed
```

Purchase confirmation increases inventory and either records payment or creates
a Supplier payable.

## 3. Payment

```text
Recorded ──→ Reversed
```

Payment reversal creates a compensating transaction and never deletes the
original payment.

## 4. Tenant and Membership

```text
Tenant: Active ──→ Suspended ──→ Active
Membership: Invited ──→ Active ──→ Suspended
```

Inactive Tenants and suspended memberships cannot perform normal operations.

## 5. Inventory Movement

Inventory movements have no mutable lifecycle. They are created once and
remain historical records. Corrections are new movements linked to the
original business document.
