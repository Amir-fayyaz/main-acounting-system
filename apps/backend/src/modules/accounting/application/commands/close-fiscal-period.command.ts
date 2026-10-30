import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';
import type { AuthenticatedPrincipalView } from '../../../identity/application/views/principal.view.js';

export interface CloseFiscalPeriodPayload {
  readonly periodId: string;
  readonly principal: AuthenticatedPrincipalView;
}

export class CloseFiscalPeriod extends Command<CloseFiscalPeriodPayload> {
  public constructor(payload: CloseFiscalPeriodPayload, options?: MessageOptions) {
    super('CloseFiscalPeriod', payload, options);
  }
}
