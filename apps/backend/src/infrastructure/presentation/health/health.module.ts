import { Module } from '@nestjs/common';
import { ReadinessModule } from '../../readiness/readiness.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [ReadinessModule],
  controllers: [HealthController],
})
export class HealthModule {}
