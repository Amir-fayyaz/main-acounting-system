## Summary

<!-- What changed and why? -->

## Verification

<!-- List the tests or checks you ran. -->

## Tenant isolation checklist

- [ ] Every new entity carries the tenant and has an isolation test.
- [ ] Tenant-owned reads and writes enforce the active tenant.
- [ ] Client-supplied tenant IDs are not trusted as the source of ownership.
- [ ] Cross-tenant access is denied, including relevant list, search, create, update, and delete paths.
- [ ] The relevant tests and checks pass.
