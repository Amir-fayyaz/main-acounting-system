# MVP API Contract

## 1. Conventions

- Base path: `/api/v1`
- JSON request and response bodies
- Authenticated requests use `Authorization: Bearer <token>`.
- Tenant context is resolved server-side from membership and active Tenant.
- Client-supplied `tenant_id` is never sufficient for authorization.
- Mutating financial or inventory operations accept an idempotency key.

## 2. Standard Response

Success responses return the resource or an operation result. Errors use:

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Available stock is insufficient",
    "details": {}
  },
  "request_id": "opaque-request-id"
}
```

Common status codes are `400` validation error, `401` unauthenticated, `403`
forbidden, `404` not found within the active Tenant, `409` conflict, and `422`
business-rule violation.

## 3. Identity and Tenant Selection

- `POST /auth/register`
- `POST /auth/login`
- `GET /me`
- `GET /me/tenants`
- `POST /me/active-tenant`
- `GET /tenants/{tenantId}`
- `PATCH /tenants/{tenantId}`
- `GET /tenants/{tenantId}/members`
- `POST /tenants/{tenantId}/members`
- `PATCH /tenants/{tenantId}/members/{memberId}`

The active Tenant must be one the authenticated User owns or belongs to.

## 4. Catalog and Inventory

- `GET /products`
- `POST /products`
- `PATCH /products/{id}`
- `GET /products/search?q=`
- `GET /inventory`
- `GET /inventory/{productId}/movements`
- `POST /inventory/adjustments`
- `POST /inventory/counts`

Product mutation requires Owner or Accountant. Inventory operations require
Owner, Accountant, or Stock Keeper according to the permission matrix.

## 5. Sales, Purchases, and Payments

- `POST /sales/invoices`
- `GET /sales/invoices`
- `GET /sales/invoices/{id}`
- `POST /sales/invoices/{id}/returns`
- `POST /purchases/invoices`
- `GET /purchases/invoices`
- `POST /payments`
- `POST /expenses`
- `GET /customers`
- `POST /customers`
- `GET /suppliers`
- `POST /suppliers`

Sales confirmation atomically validates stock, creates the invoice, creates
inventory movements, and records payment or credit.

## 6. Reports

- `GET /reports/sales?from=&to=`
- `GET /reports/profit-loss?from=&to=`
- `GET /reports/debtors-creditors`
- `GET /reports/inventory`
- `GET /dashboard/financial-summary`

All report queries are scoped to the active Tenant.

## 7. API Rules

- Confirmed financial documents have no generic `PUT` or `DELETE` endpoint.
- Corrections, returns, and reversals use explicit action endpoints.
- List endpoints require pagination and return stable ordering.
- Resource lookup always includes Tenant scope.
- Authorization is checked on the server for every command and query.
