import { Inject, Module, type OnApplicationShutdown, type Provider } from '@nestjs/common';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import { createPool, type Pool } from 'mysql2/promise';
import { AppConfigService } from '../config/app-config.service.js';
import { DATABASE, MYSQL_CONNECTION_POOL } from './database.tokens.js';

/**
 * Drizzle instance shared by the persistence adapters of the domain modules.
 *
 * The schema is intentionally empty: each module owns its tables and migrations
 * inside its own `infrastructure/persistence` layer (TECH-003), so no global
 * schema is registered here.
 */
export type Database = MySql2Database<Record<string, never>>;

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
  ] satisfies Provider[],
  exports: [MYSQL_CONNECTION_POOL, DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(MYSQL_CONNECTION_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
