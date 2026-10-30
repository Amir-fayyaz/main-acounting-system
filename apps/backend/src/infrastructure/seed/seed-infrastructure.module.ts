import { Module } from '@nestjs/common';

import { DatabaseModule, type Database } from '../database/database.module.js';
import { DATABASE } from '../database/database.tokens.js';
import { DrizzleSeedRegistry } from './persistence/drizzle-seed-registry.js';
import type { SeedRegistry } from './seed-registry.port.js';
import { SEED_REGISTRY } from './seed.tokens.js';

/**
 * The infrastructure behind the development seeder (DEV-001).
 *
 * It provides exactly one thing: the stable fixture registry that lets a
 * repeated `pnpm seed` reuse the tenants it created. Nothing here is imported
 * by a business module — this is tooling infrastructure, and the seeder process
 * is its only consumer.
 */
@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: SEED_REGISTRY,
      useFactory: (database: Database): SeedRegistry => new DrizzleSeedRegistry(database),
      inject: [DATABASE],
    },
  ],
  exports: [SEED_REGISTRY],
})
export class SeedInfrastructureModule {}
