import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';
import type { TenantStatusValue } from '../../domain/value-objects/tenant-status.js';

/** The input `ChangeTenantStatus` needs. */
export interface ChangeTenantStatusPayload {
  /** The tenant to change; must match the current tenant scope. */
  readonly tenantId: string;
  /** The lifecycle state to move to. */
  readonly status: TenantStatusValue;
  /** The revision the caller read; the write is refused if it moved. */
  readonly expectedRevision: number;
}

/**
 * The intent to move a tenant along its lifecycle (IAM-001; SHR-003).
 *
 * The domain decides whether the requested move is legal from the current
 * state; the command only states the target.
 */
export class ChangeTenantStatus extends Command<ChangeTenantStatusPayload> {
  public constructor(payload: ChangeTenantStatusPayload, options?: MessageOptions) {
    super('ChangeTenantStatus', payload, options);
  }
}
