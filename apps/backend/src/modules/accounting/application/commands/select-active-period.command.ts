import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/** The input `SelectActivePeriod` needs: which period to make active. */
export interface SelectActivePeriodPayload {
  /** The fiscal period that should become the tenant's single active one. */
  readonly periodId: string;
}

/**
 * The intent to move a tenant's active period (FIS-004; SHR-003).
 *
 * A command states *what should happen* and carries the input, never a result
 * and never a transport. The target's `open` state is a business decision the
 * use case makes at the revision it read, not an input, and the tenant is
 * deliberately not in the payload: a tenant-scoped operation acts for the
 * tenant the trusted boundary already resolved (SHR-007).
 */
export class SelectActivePeriod extends Command<SelectActivePeriodPayload> {
  public constructor(payload: SelectActivePeriodPayload, options?: MessageOptions) {
    super('SelectActivePeriod', payload, options);
  }
}
