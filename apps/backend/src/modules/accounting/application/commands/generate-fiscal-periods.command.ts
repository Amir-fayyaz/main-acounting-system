import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/** The input `GenerateFiscalPeriods` needs: which fiscal year to plan. */
export interface GenerateFiscalPeriodsPayload {
  /** The fiscal year whose twelve monthly periods to generate. */
  readonly fiscalYearId: string;
}

/**
 * The intent to generate a fiscal year's periods (FIS-004; SHR-003).
 *
 * A command states *what should happen* and carries the input, never a result
 * and never a transport. The tenant is deliberately **not** in the payload: a
 * tenant-scoped operation acts for the tenant the trusted boundary already
 * resolved into the ambient scope, and nothing here reads a client-supplied
 * tenant (SHR-007).
 */
export class GenerateFiscalPeriods extends Command<GenerateFiscalPeriodsPayload> {
  public constructor(payload: GenerateFiscalPeriodsPayload, options?: MessageOptions) {
    super('GenerateFiscalPeriods', payload, options);
  }
}
