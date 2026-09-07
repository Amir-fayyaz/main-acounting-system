import { Module } from '@nestjs/common';
import { AppConfigModule } from '@infra/config/app-config.module';
import { SharedKernelModule } from '@infra/shared-kernel/shared-kernel.module';
import { HealthModule } from '@infra/http/health/health.module';

@Module({
  imports: [AppConfigModule, SharedKernelModule, HealthModule],
})
export class AppModule {}
