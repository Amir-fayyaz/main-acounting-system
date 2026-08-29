# MVP Workflows

## 1. Confirm Sales Invoice

1. Authenticate user and resolve `tenant_id`.
2. Verify Cashier, Accountant, or Owner permission.
3. Validate products, quantities, prices, and payment allocation.
4. Require sufficient available stock.
5. Create the confirmed invoice and immutable items.
6. Create inventory sale movements atomically.
7. Create payment/credit transactions atomically.
8. Update projections and emit an audit event.

If any step fails, the business transaction is rolled back.

## 2. Record Purchase

1. Verify Accountant or Owner permission.
2. Validate Supplier and invoice items within the same Tenant.
3. Create the confirmed purchase invoice.
4. Create purchase inventory movements.
5. Record cash/bank payment or Supplier payable.

## 3. Stock Adjustment

1. Verify Stock Keeper, Accountant, or Owner permission.
2. Validate product and quantity.
3. Require an adjustment reason.
4. Create an immutable adjustment movement.
5. Update the balance projection and audit the actor.

## 4. Correction or Return

The original document remains unchanged. A new return, reversal, or correction
document references the original and creates the compensating inventory and
financial transactions.

## 5. Tenant Resolution

Every request resolves the authenticated user's active Tenant membership on
the server. Client-provided `tenant_id` is never sufficient for authorization.
