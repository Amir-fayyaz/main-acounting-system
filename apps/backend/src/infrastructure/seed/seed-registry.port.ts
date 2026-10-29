/**
 * The stable key → record mapping the development seeder keeps (DEV-001).
 *
 * It exists for the fixtures that have no natural key of their own — a tenant
 * is always created with a freshly generated identity — so that a repeated
 * `pnpm seed` reuses what the previous run created instead of adding a second
 * copy. It is tooling metadata owned by infrastructure, not a module table and
 * not business data.
 */
export interface SeedFixture {
  /** The deterministic fixture key, e.g. `tenant.aria-trading`. */
  readonly fixtureKey: string;
  /** The kind of record the key names, e.g. `tenant`. */
  readonly entityType: string;
  /** The identity of the record the key resolved to. */
  readonly entityId: string;
}

/** Read-everything / record-one access to the fixture registry. */
export interface SeedRegistry {
  /** Every recorded fixture, keyed by its fixture key. */
  load(): Promise<ReadonlyMap<string, SeedFixture>>;

  /** Records (or re-points) one fixture key. Never deletes. */
  record(fixture: SeedFixture): Promise<void>;
}
