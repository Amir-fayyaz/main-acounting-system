# ADR-003 — MVP Domain and Authorization Decisions

## Status

Accepted

## Decision

The MVP uses a multi-Tenant model where one Owner may own multiple Tenants and
each Tenant has exactly one Owner. Employees belong to Tenants through an
explicit membership and role.

The MVP supports Owner, Accountant, Cashier, Stock Keeper, and Super Admin.
Financial documents are immutable and all corrections use linked new records.
Inventory cannot be negative, and each Tenant selects FIFO or LIFO from the
start of the MVP.

## Rationale

This provides the required accounting controls and preserves an extension path
for warehouses, approvals, and double-entry accounting without complicating
the first release with unnecessary workflow steps.

## Consequences

- All Tenant-owned records require `tenant_id`.
- Authorization must check identity, membership, role, and resource ownership.
- Inventory movements and financial documents require auditability.
- Projections may be optimized later because authoritative history is retained.
