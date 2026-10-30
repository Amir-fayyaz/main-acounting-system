import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { AppConfigService } from '../../../infrastructure/config/app-config.service.js';
import { BootstrapSystemAdminUseCase } from '../application/use-cases/bootstrap-system-admin.use-case.js';

/** API initialization gate: Nest does not begin listening until this hook resolves. */
@Injectable()
export class SystemAdminBootstrapRunner implements OnApplicationBootstrap {
  private readonly logger = new Logger(SystemAdminBootstrapRunner.name);

  public constructor(
    private readonly config: AppConfigService,
    private readonly bootstrap: BootstrapSystemAdminUseCase,
  ) {}

  public async onApplicationBootstrap(): Promise<void> {
    const result = await this.bootstrap.execute(this.config.systemAdmin);
    if (result === 'disabled') return;

    // Never log the configured email, password, hash or user-provided display name.
    this.logger.log(`Product Owner bootstrap ${result}.`);
  }
}
