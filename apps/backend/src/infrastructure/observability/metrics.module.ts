import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { MetricsService } from './metrics.service.js';

/**
 * The process metrics layer (FND-014).
 *
 * One registry per process holds the Node.js default metrics, the HTTP
 * histogram, the job execution histogram, the queue depth gauge and the
 * database pool gauges. Every process (API, Worker, Scheduler) can import it;
 * only the HTTP process also declares the `/api/metrics` endpoint, in the
 * metrics presentation module.
 *
 * `DatabaseModule` supplies the MySQL pool the pool gauges read, and is
 * re-exported so importers get the pool without importing it again.
 */
@Module({
  imports: [DatabaseModule],
  providers: [MetricsService],
  exports: [MetricsService, DatabaseModule],
})
export class MetricsModule {}
