import type { Database } from '../../database/database.module.js';
import { scopedDatabase } from '../../database/scoped-database.js';
import type { SeedFixture, SeedRegistry } from '../seed-registry.port.js';
import { seedFixtures } from './seed-fixture.schema.js';

/**
 * Drizzle/MySQL implementation of the seed fixture registry (DEV-001).
 *
 * `load` is a single unbounded select on purpose: the registry holds one row per
 * seeded fixture (a handful), and the seeder asks for all of them once per run.
 * `record` is an explicit insert-or-update of the row's own identity — a key
 * that is recorded twice keeps exactly one row, which is what makes re-running
 * the seeder update a stale pointer instead of growing a second one.
 *
 * The adapter writes through `scopedDatabase`, like every other adapter, so it
 * participates in a boundary when one is open and is a single statement when
 * none is (SHR-005).
 */
export class DrizzleSeedRegistry implements SeedRegistry {
  public constructor(private readonly database: Database) {}

  public async load(): Promise<ReadonlyMap<string, SeedFixture>> {
    const rows = await scopedDatabase(this.database)
      .select({
        fixtureKey: seedFixtures.fixtureKey,
        entityType: seedFixtures.entityType,
        entityId: seedFixtures.entityId,
      })
      .from(seedFixtures);

    return new Map(rows.map((row) => [row.fixtureKey, { ...row }]));
  }

  public async record(fixture: SeedFixture): Promise<void> {
    const now = new Date();

    await scopedDatabase(this.database)
      .insert(seedFixtures)
      .values({
        fixtureKey: fixture.fixtureKey,
        entityType: fixture.entityType,
        entityId: fixture.entityId,
        createdAt: now,
        updatedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          entityType: fixture.entityType,
          entityId: fixture.entityId,
          updatedAt: now,
        },
      });
  }
}
