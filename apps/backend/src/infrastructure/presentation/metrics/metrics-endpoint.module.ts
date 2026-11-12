import { Module } from '@nestjs/common';
import { MetricsModule } from '../../observability/metrics.module.js';
import { MetricsController } from './metrics.controller.js';

/**
 * The HTTP presentation of the metrics layer (FND-014): the `/api/metrics`
 * scrape endpoint. Only the API process imports this module — the Worker and
 * the Scheduler collect the same metrics without serving them.
 */
@Module({
  imports: [MetricsModule],
  controllers: [MetricsController],
})
export class MetricsEndpointModule {}
