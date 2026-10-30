import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { SEED_REGISTRY } from '../src/infrastructure/seed/seed.tokens.js';
import { DevelopmentSeedRunner } from '../src/processes/seed/development-seed.runner.js';
import { SeedModule } from '../src/processes/seed/seed.module.js';

/**
 * Regression guard for the seed process wiring (DEV-001).
 *
 * `pnpm seed` boots a standalone application context instead of the HTTP app,
 * so every use case the runner composes has to be resolvable in that context.
 * Compiling the graph catches a missing export (a module that forgot to publish
 * the use case the seeder needs) before it becomes a runtime command failure.
 * Compilation opens no connection: the database pool is lazy and no lifecycle
 * hook runs until the context is initialised.
 */
describe('seed process wiring (e2e)', () => {
  it('compiles the seed context and resolves the runner and its registry', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [SeedModule] }).compile();

    try {
      expect(moduleRef.get(AppConfigService).environment.name).toBe('test');
      expect(moduleRef.get(DevelopmentSeedRunner)).toBeInstanceOf(DevelopmentSeedRunner);
      expect(moduleRef.get(SEED_REGISTRY)).toBeDefined();
    } finally {
      await moduleRef.close();
    }
  });
});
