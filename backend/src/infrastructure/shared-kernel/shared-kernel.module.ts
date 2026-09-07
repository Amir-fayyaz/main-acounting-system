import { Global, Module } from '@nestjs/common';
import { CLOCK } from '@shared/domain/providers/clock.provider';
import { ID_GENERATOR } from '@shared/domain/providers/id-generator.provider';
import { SystemClock } from '@shared/infrastructure/clock/system-clock';
import { UuidIdGenerator } from '@shared/infrastructure/id-generator/uuid-id-generator';

/**
 * Composition root for shared-kernel ports. Business modules inject CLOCK and
 * ID_GENERATOR instead of importing concrete adapters, keeping the dependency
 * rule: infrastructure implements domain/application contracts.
 */
@Global()
@Module({
  providers: [
    { provide: CLOCK, useClass: SystemClock },
    { provide: ID_GENERATOR, useClass: UuidIdGenerator },
  ],
  exports: [CLOCK, ID_GENERATOR],
})
export class SharedKernelModule {}
