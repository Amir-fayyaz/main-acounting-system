import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

export interface ActivateStandardChartPayload {
  readonly templateVersion: string;
}

export class ActivateStandardChart extends Command<ActivateStandardChartPayload> {
  public constructor(payload: ActivateStandardChartPayload, options?: MessageOptions) {
    super('ActivateStandardChart', payload, options);
  }
}
