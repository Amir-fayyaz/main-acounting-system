# Rollback plan — `suppliers` migration (`0010_supreme_kang`)

This document is the written rollback plan required by S3 (issue #245). The
migration journal is forward-only (`drizzle-kit generate` appends; nothing in
`drizzle/meta/_journal.json` is edited by hand), so the reversal is described
here and declared in code as `SUPPLIERS_DOWN_DDL` in
`supplier.schema.ts`. No automated test drops the table: the S3 verification
rules forbid a spec teardown from dropping tables or touching the journal.

## What the migration created

`apps/backend/drizzle/0010_supreme_kang.sql`:

- table `suppliers` with columns `id`, `tenant_id`, `code`, `name`,
  `normalized_name`, `identification_number`, `contact_phone`, `contact_email`,
  `contact_address`, `contact_postal_code`, `status`, `revision`, `created_at`,
  `updated_at`;
- primary key `suppliers_id`;
- unique keys `suppliers_tenant_code_unique` and
  `suppliers_tenant_identification_unique`;
- index `suppliers_tenant_normalized_name_index`;
- check constraint `suppliers_status_check`;
- no foreign keys (nothing references `suppliers` yet, and it references
  nothing).

The down DDL is exactly:

```sql
DROP TABLE IF EXISTS `suppliers`;
```

## When to roll back

Roll back only if the migration itself is wrong — a column type, constraint or
index that must be corrected before the table is used in production. Once
purchase documents reference suppliers, removal is no longer a table drop:

- the table is master data, not financial history, so today it can be recreated
  from the company's supplier records;
- as soon as another module stores a supplier id, dropping the table would
  orphan those references. From that point the correct response is a new
  forward migration (for example a lifecycle/`inactive` change or a data
  backfill), never `DROP TABLE`.

## Procedure

1. **Take a backup of the table** (or at least the rows) before any destructive
   step. The table can be recreated but the rows cannot be regenerated
   automatically:

   ```bash
   mysqldump --single-transaction --no-create-info \
     --where="1=1" "$DB_NAME" suppliers > suppliers-backup.sql
   ```

2. **Confirm nothing references the table.** Until purchase documents exist the
   only reader is `DrizzleSupplierRepository`; stop the API/worker processes
   that use it (or accept that in-flight writes will fail after the drop).

3. **Apply the down DDL** manually against the target database:

   ```sql
   DROP TABLE IF EXISTS `suppliers`;
   ```

   It is intentionally idempotent; running it twice is safe.

4. **Correct the schema**, then re-generate and re-apply the forward migration:

   ```bash
   pnpm --filter @accounting-saas/backend db:generate
   pnpm --filter @accounting-saas/backend db:migrate
   ```

   `db:generate` will produce a new journal entry (for example `0011_*`) that
   re-creates the corrected table. Do **not** delete or rewrite `0010_*` or
   edit `meta/_journal.json`: applied history is immutable, and a fresh
   environment must still be able to replay every entry in order.

5. **Restore the rows** if the backup is needed:

   ```bash
   mysql "$DB_NAME" < suppliers-backup.sql
   ```

   The data must satisfy the current constraints; if a restored row violates a
   corrected constraint, fix the row (not the constraint) or keep it out.

6. **Verify** the table is back and the application can read it:

   ```bash
   pnpm --filter @accounting-saas/backend db:check
   MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
   ```

## What not to do

- Do not edit `drizzle/meta/_journal.json` or delete an applied migration to
  "undo" it; that desynchronizes every environment that already ran it.
- Do not drop the table from a test teardown: integration specs delete only the
  rows of their own tenant ids.
- Do not drop the table after suppliers are referenced by other tables; take a
  forward migration instead.
