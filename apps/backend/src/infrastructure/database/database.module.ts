import { Inject, Module, type OnApplicationShutdown, type Provider } from '@nestjs/common';
 import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool } from 'mysql2/promise';
import {
  createTransactionBoundary,
  type TransactionBoundary,
} from '../../shared/transaction/transaction-boundary.js';
import { AppConfigService } from '../config/app-config.service.js';
import { DrizzleTransactionRunner } from './drizzle-transaction-runner.js';
import { DATABASE, MYSQL_CONNECTION_POOL, TRANSACTION_BOUNDARY } from './database.tokens.js';
  import type { Database } from './database.types.js';


  export type { Database };
const CONNECTION_LIMIT = 10;

/**
 * Database connectivity for the modular monolith (ADR-001, section 6).
 *
 * The pool is created lazily by `mysql2` — no connection is opened at boot — so
 * the API process can start while MySQL is unavailable, and a failing database
 * surfaces as an explicit error on the first query instead of a silent startup
 * failure. Connections are always released on shutdown.
 */
@Module({
  providers: [
    {
      provide: MYSQL_CONNECTION_POOL,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): Pool => {
        const { host, port, user, password, name } = config.database;

        return createPool({
          host,
          port,
          user,
          password,
          database: name,
          connectionLimit: CONNECTION_LIMIT,
          waitForConnections: true,
          queueLimit: 0,
          timezone: 'Z',
          enableKeepAlive: true,
        });
      },
    },
    {
      provide: DATABASE,
      inject: [MYSQL_CONNECTION_POOL],
      useFactory: (pool: Pool): Database => drizzle(pool) as Database,
    },
    {
      // The Application-owned transaction boundary (SHR-005): use cases inject
      // this port and call `execute`; the driver mechanics stay behind the
      // runner, and Domain never sees either.
      provide: TRANSACTION_BOUNDARY,
      inject: [DATABASE],
      useFactory: (database: Database): TransactionBoundary =>
        createTransactionBoundary(new DrizzleTransactionRunner(database)),
    },
  ] satisfies Provider[],
  exports: [MYSQL_CONNECTION_POOL, DATABASE, TRANSACTION_BOUNDARY],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(MYSQL_CONNECTION_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
