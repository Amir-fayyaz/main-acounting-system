import { Module } from '@nestjs/common';
import { HealthModule } from './infrastructure/http/health/health.module';

@Module({
  imports: [HealthModule],
})
export class AppModule {}
