import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/**
 * The input `CreateFiscalYear` needs: the label and the inclusive date range
 * the new year covers.
 */
export interface CreateFiscalYearPayload {
  readonly label: string;
  /** Inclusive first day, `YYYY-MM-DD`. */
  readonly startDate: string;
  /** Inclusive last day, `YYYY-MM-DD`. */
  readonly endDate: string;
}

/**
 * The intent to create a fiscal year (FIS-002; SHR-003).
 *
 * A command states *what should happen* and carries the input, never a result
 * and never a transport. The tenant is deliberately **not** in the payload:
 * a tenant-scoped operation acts for the tenant the trusted boundary already
 * resolved into the ambient scope, and nothing here reads a client-supplied
 * tenant (SHR-007; `src/modules/README.md` rule 13).
 */
export class CreateFiscalYear extends Command<CreateFiscalYearPayload> {
  public constructor(payload: CreateFiscalYearPayload, options?: MessageOptions) {
    super('CreateFiscalYear', payload, options);
  }
}
