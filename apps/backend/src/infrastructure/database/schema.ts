// Schema entry point for drizzle-kit (FND-010).
//
// Aggregates every module-owned Drizzle table so drizzle-kit can consume the
// full schema from a single entry point. Modules keep owning their own schemas
// in `<module>/infrastructure/persistence/*.schema.ts`; infrastructure-owned
// persistence (outbox, seed fixtures) keeps its schema beside its adapter.
//
// This file only re-exports — it declares no tables itself.

export * from '../../modules/tenant/public-api.js';
export * from '../../modules/identity/infrastructure/persistence/drizzle-user.schema.js';
export * from '../../modules/identity/infrastructure/persistence/drizzle-credential.schema.js';
export * from '../../modules/identity/infrastructure/persistence/drizzle-auth-session.schema.js';
export * from '../../modules/identity/infrastructure/persistence/drizzle-membership.schema.js';
export * from '../../modules/identity/infrastructure/persistence/drizzle-membership-role.schema.js';
export * from '../../modules/identity/infrastructure/persistence/drizzle-role.schema.js';
export * from '../../modules/identity/infrastructure/persistence/drizzle-active-company.schema.js';
export * from '../../modules/identity/infrastructure/persistence/drizzle-platform-authorization.schema.js';
export * from '../../modules/audit/infrastructure/persistence/audit-record.schema.js';
export * from '../../modules/accounting/infrastructure/persistence/fiscal-year.schema.js';
export * from '../../modules/accounting/infrastructure/persistence/fiscal-period.schema.js';
export * from '../outbox/persistence/outbox.schema.js';
export * from '../seed/persistence/seed-fixture.schema.js';
