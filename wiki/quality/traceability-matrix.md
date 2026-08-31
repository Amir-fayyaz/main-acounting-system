# MVP Traceability Matrix

| Capability | Source story | Command/API | Main data | Mandatory tests |
|---|---|---|---|---|
| Register and tenant | US-1.1, US-1.3 | `/auth/register`, `/tenants` | users, tenants, memberships | auth, isolation |
| Membership and roles | US-1.4, US-1.8 | `/members`, `/active-tenant` | memberships | role matrix |
| Catalog | US-2.1–2.3 | `/products`, `/categories` | products | validation, uniqueness |
| Inventory | US-2.4–2.5 | `/inventory`, adjustments | movements, balances, layers | FIFO/LIFO, concurrency |
| Sales | US-3.1–3.5 | `/sales/invoices`, returns | invoices, items, links | atomicity, immutability |
| Purchases | US-4.1 | `/purchases/invoices` | invoices, movements | stock and payable |
| Contacts | US-5.1–5.3 | `/customers`, `/suppliers` | contacts, settlements | balance reconciliation |
| Cash/bank | US-6.1–6.3 | accounts, payments, checks | accounts, payments | allocation and permissions |
| Reports | US-7.1–7.4 | `/reports/*` | projections/query services | tenant scope, totals |
| Dashboard | US-8.1 | `/dashboard/financial-summary` | report projections | date/timezone |

Every row requires unit, integration, API, and at least one end-to-end scenario
before its release gate is considered complete.

