import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';
import type { AuthenticatedPrincipalView } from '../../../identity/application/views/principal.view.js';

export interface ReopenFiscalPeriodPayload {
  readonly periodId: string;
  readonly reason: string;
  readonly principal: AuthenticatedPrincipalView;
}

export class ReopenFiscalPeriod extends Command<ReopenFiscalPeriodPayload> {
  public constructor(payload: ReopenFiscalPeriodPayload, options?: MessageOptions) {
    super('ReopenFiscalPeriod', payload, options);
  }
}
