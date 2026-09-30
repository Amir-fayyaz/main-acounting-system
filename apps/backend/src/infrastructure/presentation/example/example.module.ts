import { Module } from '@nestjs/common';
import { ExampleController } from './example.controller.js';
import { ExampleService } from './example.service.js';

/**
 * Module of the reference example endpoint (FND-006).
 *
 * `AppConfigService` is injected without importing `AppConfigModule` because the
 * configuration module is global (TECH-001: configuration is shared
 * infrastructure, the one allowed case for a global module).
 */
@Module({
  controllers: [ExampleController],
  providers: [ExampleService],
})
export class ExampleModule {}
