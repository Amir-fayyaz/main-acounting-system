# Backend tenant-isolation contract tests

The reusable contract lives at `apps/backend/test/support/tenant-isolation-contract.ts`.
Register each tenant-aware module's entity with `registerTenantIsolationSuite(...)` from a backend test file. The test adapter should invoke the **real use case or HTTP route** and normalize an expected authorization/not-found response to `{ allowed: false }`; only expected refusals should be normalized. Unexpected exceptions should be rethrown so a defect fails the test. For swapped route/resource identifiers and tampered headers, use the HTTP route adapter so the authorization guard is exercised; a use-case-only adapter cannot prove path/header validation.

Each test gets a new fixture containing two companies, one actor per company, and one record per company. The shared checks cover foreign-ID reads, swapped tenant/record identifiers, missing tenant scope, and concurrent tenant reads. Add the entity operations it actually exposes:

- `list`: prove every returned record belongs to the caller's tenant.
- `searchFor`: search for a value unique to tenant B's record while acting as tenant A.
- `createWithTenantId`: send tenant B's id as untrusted create input and assert the saved record belongs to tenant A.
- `updateById` / `deleteById`: attempt the operation on tenant B's record and compare a trusted persisted snapshot before and after.
- `withTamperedHeader`: use the real transport boundary to assert a tenant B header cannot change or widen tenant A's request.

Operations are optional because a contract must not invent endpoints. The Tenant module registers read/update checks: `tenants` is the root company registry, so a tenant row's own `id` is its boundary, and creation is a platform-level operation rather than a tenant-owned create. The current backend has no dedicated search endpoint, so `searchFor` is a hook for modules that expose search. Tenant-owned modules should register every operation they expose, including create/list/search/delete where present.

## Central filter mutation tripwire

`apps/backend/src/modules/identity/infrastructure/persistence/tenant-filter-contract.spec.ts` captures the `WHERE` clause from the real `DrizzleMembershipRepository.get()` method, compiles it with Drizzle's MySQL dialect, and asserts that it contains a bound `tenant_id = ?` predicate for the active scope. It fails if the call is removed from the repository or if `tenantEq()` is mutated to a no-op. To manually mutation-check it, temporarily remove `tenantEq(memberships.tenantId)` from that lookup (or change `tenantEq()` in `src/infrastructure/database/tenant-scoped.ts` to an unconditional/no-op predicate) and run:

```bash
pnpm --filter @accounting-saas/backend test -- src/modules/identity/infrastructure/persistence/tenant-filter-contract.spec.ts
```

That focused test must fail; restore the implementation before committing. The full contract is included in the backend Vitest run, which is invoked by the workspace test step in `pnpm verify`. CI also runs the three isolation specs in a dedicated job on every pull request, including frontend-only PRs that would otherwise skip the path-filtered backend job.

## Running the tests

```bash
pnpm --filter @accounting-saas/backend test -- test/tenant-isolation-contract.e2e-spec.ts
pnpm --filter @accounting-saas/backend test -- test/tenant-isolation.e2e-spec.ts
pnpm verify
```
