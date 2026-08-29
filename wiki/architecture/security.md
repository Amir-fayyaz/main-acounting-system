# Security Architecture

## 1. Purpose

This document defines the security model for the Accounting SaaS platform.

The security architecture must protect:

- User identities
- Tenant-owned business data
- Financial information
- Inventory information
- Authentication credentials
- Administrative operations
- Auditability of sensitive actions

Security is a system-wide concern and must be enforced by the backend and
application boundaries, not by the frontend alone.

---

## 2. Security Principles

### 2.1 Deny by Default

Access should be denied unless the user is explicitly authenticated and
authorized for the requested operation.

### 2.2 Backend Is the Security Authority

Frontend visibility is never considered an authorization mechanism.

For example, hiding a financial report from a Cashier in the UI is not enough.
The backend must reject the request as well.

### 2.3 Tenant Isolation Is Mandatory

A valid user account must not provide access to another tenant's data.

Tenant membership/ownership and resource ownership must be checked for
shop-scoped operations.

### 2.4 Least Privilege

Each role should receive only the permissions required for its business
responsibilities.

### 2.5 Explicit Administrative Boundaries

Platform-level administrative privileges must be separated from ordinary shop
financial access.

### 2.6 Audit Sensitive Actions

Security-sensitive and financially significant operations should be traceable
to the user, tenant, action, resource, and time.

---

## 3. Authentication

Authentication establishes the identity of the caller.

The current product requirements define:

- Registration using mobile number or email
- Password-based login
- Verification code during registration
- JWT-based authentication after successful login
- Account lock after repeated failed login attempts

The exact authentication implementation remains an architecture decision.

---

## 4. Registration Security

The registration flow should conceptually be:

```text
Registration Request
        ↓
Validate Input
        ↓
Create Verification Challenge
        ↓
Send Verification Code
        ↓
Verify Code
        ↓
Activate User Account
```

The verification code must not be considered valid merely because a client
claims to have completed verification.

The server must maintain the verification state.

### Password Requirements

The current product requirements define a minimum password length of eight
characters.

Additional password-strength requirements may be introduced later, but should
be explicitly documented before becoming product requirements.

---

## 5. Login Security

The login flow is:

```text
Credentials
    ↓
Validate User
    ↓
Verify Password
    ↓
Check Account Status
    ↓
Check Shop Status (when applicable)
    ↓
Issue Authenticated Session / JWT
```

An inactive user must not be permitted to authenticate for normal system use.

An inactive shop must prevent its shop-level users from accessing that shop.

---

## 6. Brute-Force Protection

The current requirements define:

```text
5 failed password attempts
        ↓
15 minute account lock
```

The implementation must ensure that the lock cannot be bypassed merely by
repeating the same login operation through another client.

Additional rate limiting may be introduced at the API/infrastructure level,
but the exact rate-limiting policy is not yet defined.

---

## 7. JWT / Session Security

The platform currently expects JWT-based authentication.

A conceptual authenticated token may contain:

```text
user_id
role
active_shop_id       # when applicable
```

An Owner with multiple shops may need additional representation of authorized
shops.

The exact token claims are intentionally left open until the multi-tenancy and
authentication implementation is finalized.

### Important Rules

- Tokens must not be trusted as the only source of authorization.
- Tenant authorization must be validated server-side.
- Sensitive secrets must never be exposed to clients.
- Expired/revoked sessions must not remain usable.
- Token storage and renewal strategy must be defined before production deployment.

---

## 8. Authorization

Authorization determines whether an authenticated identity may perform an
operation.

The platform uses two main authorization dimensions:

```text
Role / Permission
        +
Tenant / Resource Scope
```

For shop-level operations, both must be satisfied.

Example:

```text
Cashier
+
Create Sale
+
Shop A context
+
Resources belong to Shop A
=
Allowed
```

Whereas:

```text
Cashier
+
Read Invoice
+
Shop A context
+
Invoice belongs to Shop B
=
Denied
```

---

## 9. Role-Based Access Control

The current product defines the following MVP roles:

- Super Admin
- Owner
- Accountant
- Cashier
- Stock Keeper

The role responsibilities and currently known permissions are documented in:

```text
wiki/product/roles-and-permissions.md
```

Role definitions should remain separate from tenant isolation.

A role determines what a user may do.

Tenant scope determines where the user may do it.

---

## 10. Resource Authorization

Authorization should be enforced at the resource boundary when an operation
targets a specific record.

For example:

```text
GET /invoices/{invoiceId}
```

must validate both:

```text
User permission
+
Invoice belongs to authorized tenant
```

The same principle applies to:

- Products
- Customers
- Suppliers
- Purchases
- Payments
- Inventory records
- Cash accounts
- Bank accounts
- Expenses
- Other shop-owned resources

---

## 11. Tenant Authorization

Tenant authorization is documented in detail in:

```text
wiki/architecture/multi-tenancy.md
```

The security invariant is:

> A shop-level user can operate only within a tenant they are authorized to access.

Client-provided `shop_id` values must never be treated as sufficient proof of
authorization.

---

## 12. Super Admin Security Boundary

Super Admin is a platform-level role.

Normal Super Admin capabilities include platform operations such as:

- Viewing shops
- Searching/filtering shops
- Activating/deactivating shops
- Managing subscription plans

Super Admin must not gain ordinary access to shop financial data through
standard tenant APIs.

Any future support mechanism that permits exceptional access to shop data must:

- Be explicitly authorized
- Be separate from normal tenant endpoints
- Be fully audited
- Identify the operator
- Identify the target tenant
- Record the reason/purpose where required

---

## 13. Shop Status and Access

Shop status is part of the authorization decision for shop-level users.

Conceptually:

```text
Authenticated User
       ↓
User Active?
       ↓
Shop Active?
       ↓
User Authorized for Shop?
       ↓
Permission Granted?
       ↓
Execute Operation
```

If a shop is deactivated, its normal shop users must no longer be able to
operate within that shop.

The user's historical data should remain intact unless a separate business
policy states otherwise.

---

## 14. Sensitive Data

The platform processes potentially sensitive business information, including:

- Customer information
- Supplier information
- Sales data
- Purchase data
- Payment information
- Cash/bank balances
- Expenses
- Financial reports
- Inventory data

Access to these data types should therefore be restricted according to role,
tenant, and resource ownership.

The system should avoid logging sensitive payloads unnecessarily.

---

## 15. Password and Credential Handling

Passwords must never be stored in plaintext.

They must be stored using a modern password-hashing mechanism appropriate for
the selected runtime and security requirements.

Authentication secrets, signing keys, provider credentials, and other secrets
must be stored outside source code and managed through the deployment
environment's secret-management mechanism.

Exact algorithms, parameters, and secret-management infrastructure are
implementation decisions and must be recorded before production deployment.

---

## 16. Input Validation

All externally supplied input must be validated at the API/application
boundary.

Validation must not be limited to frontend forms.

Examples include:

- Required fields
- String lengths
- Numeric ranges
- Valid dates
- Valid identifiers
- Allowed enum values
- File type/size constraints
- Business-specific validation rules

Domain rules must still be enforced by the appropriate application/domain
boundary even when input has passed transport-level validation.

---

## 17. Injection and Unsafe Input

The application must protect against common injection classes.

Data-access code should use parameterized queries or safe ORM/query-builder
mechanisms.

User input must never be concatenated into raw queries without appropriate
parameterization.

The same principle applies to:

- SQL
- Shell commands
- Template rendering
- HTML output
- Other interpreters introduced later

Exact defensive mechanisms depend on the selected technologies.

---

## 18. File Upload Security

The product may support shop logos and generated invoice documents.

File-handling flows must validate at least:

- File type
- File size
- File name handling
- Storage location
- Access permissions

Files uploaded by users must not automatically become executable content.

The exact storage and serving model will be defined in the infrastructure and
operations documentation.

---

## 19. Audit Logging

Sensitive and financially meaningful operations should produce audit records.

A useful audit record should be attributable to:

```text
Actor
Tenant
Action
Resource
Timestamp
Result
```

Example:

```text
Actor:      User 123
Tenant:     Shop A
Action:     InvoiceConfirmed
Resource:   Invoice 456
Result:     Success
Timestamp:  ...
```

Potential audit-worthy actions include:

- Login failures/success where appropriate
- User activation/deactivation
- Shop activation/deactivation
- Role/permission changes
- Invoice confirmation
- Invoice return
- Purchase confirmation
- Financial adjustments
- Cash/payment operations
- Exceptional administrative access

The final event taxonomy is a later design decision.

---

## 20. Security Logging vs. Business Audit

These are related but distinct concepts.

### Security Log

Used primarily to investigate security events.

Examples:

- Failed login
- Authentication anomaly
- Authorization denial
- Suspicious repeated requests

### Business Audit

Used to establish accountability for meaningful business actions.

Examples:

- Invoice confirmed
- Payment recorded
- Product modified
- Shop user disabled

The implementation may use shared infrastructure, but the semantic purposes
should remain distinct.

---

## 21. Error Handling and Information Disclosure

Error responses must not reveal sensitive information unnecessarily.

Examples:

A cross-tenant resource request should not expose the target tenant's
existence or data.

Depending on the endpoint and threat model, the API may intentionally return
`404 Not Found` rather than revealing that a resource exists but is forbidden.

Authentication failures should avoid exposing whether a particular credential
component is valid when that distinction is not necessary.

---

## 22. Rate Limiting

Rate limiting is required for security-sensitive and abuse-prone endpoints,
especially:

- Login
- Registration
- Verification-code requests
- Password recovery, if introduced
- Public document endpoints, if introduced
- Other externally exposed high-cost operations

The exact limits and storage mechanism remain `TBD`.

---

## 23. Background Jobs

Background workers must preserve security context when operating on tenant
data.

For tenant-owned work:

```text
Event / Job
    ↓
Tenant Identifier
    ↓
Validate Job Context
    ↓
Execute Tenant-Scoped Operation
```

A worker must not infer tenant identity from unrelated global state.

This requirement is especially important for:

- Notifications
- Payment reminders
- Low-stock notifications
- Subscription jobs
- Document generation
- Scheduled reports

---

## 24. Cache Security

If caching is introduced, tenant-owned data must not leak across tenants.

Tenant identity should be part of the cache isolation model where necessary.

Conceptually:

```text
tenant:{shopId}:products:{productId}
```

rather than using a globally ambiguous key for tenant-owned data.

The exact cache technology and policy are not yet defined.

---

## 25. Security Testing

Security testing must include dedicated tenant and authorization scenarios.

At minimum:

### Authentication

- Invalid credentials are rejected.
- Repeated failures trigger the configured lock behavior.
- Inactive users cannot authenticate normally.
- Inactive shops block shop access.

### Authorization

- Cashier cannot access the profit/loss report.
- Unauthorized roles receive an appropriate authorization error.
- Direct resource access is checked against permissions and tenant scope.

### Tenant Isolation

- Shop A cannot read Shop B data.
- Shop A cannot update Shop B data.
- Shop A cannot delete Shop B data.
- Shop A list endpoints do not return Shop B records.
- Client-supplied `shop_id` cannot bypass isolation.
- Background jobs cannot cross tenant boundaries.

### Administrative Boundary

- Super Admin cannot access shop financial data through normal tenant APIs.
- Exceptional support access, if implemented, is audited.

---

## 26. Security Non-Goals

This document does not currently define:

- Specific cloud provider
- Specific WAF/CDN
- Exact firewall topology
- Exact secret-management product
- Exact password-hashing library/configuration
- Exact JWT library
- Exact database-level row security configuration
- Full penetration-testing methodology
- Compliance certification requirements

These are future infrastructure, security, or operational decisions.

---

## 27. Security Invariants

The following invariants must remain true regardless of implementation:

```text
1. No password is stored in plaintext.

2. Authentication is required for protected operations.

3. Authorization is enforced server-side.

4. Role permission alone is not sufficient for tenant-scoped access.

5. Tenant/resource ownership must be validated.

6. Client-supplied tenant identifiers are not trusted by themselves.

7. Super Admin platform privileges do not automatically bypass normal
   tenant-security boundaries.

8. Sensitive business actions must be auditable where required.

9. Background jobs operating on tenant data must carry explicit tenant
   context.

10. Security controls must not depend on frontend behavior.
```

---

## 28. Open Decisions

The MVP roles are `Super Admin`, `Owner`, `Accountant`, `Cashier`, and `Stock
Keeper`. Accountant is a Tenant employee with full operational and financial
workflow access, excluding ownership changes and deletion of financial
documents. The canonical matrix is in `product/roles-and-permissions.md`.

Closed MVP authentication decisions are Argon2id password hashing,
15-minute access JWTs, and hashed rotating refresh tokens. Remaining open
items are provider-specific OTP policy and production secret-management
vendor selection.

The following items remain to be finalized:

1. Authentication/session architecture.
2. Exact JWT claims and token lifetime.
3. Refresh-token or session strategy.
4. Password-hashing algorithm and parameters.
5. Verification-code generation, expiry, and retry policy.
6. Rate-limiting thresholds and implementation.
7. Exact RBAC/permission representation.
8. Policy engine vs. application-level authorization checks.
9. Exact audit-event schema and retention policy.
10. Database-level security controls.
11. File storage and access-control strategy.
12. Secrets management.
13. Security monitoring and alerting.
14. Production security testing requirements.
