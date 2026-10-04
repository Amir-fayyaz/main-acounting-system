import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/** The input `UpdateTenant` needs. */
export interface UpdateTenantPayload {
  /** The tenant to change; must match the current tenant scope. */
  readonly tenantId: string;
  /** The new name. */
  readonly name: string;
  /** The revision the caller read; the write is refused if it moved. */
  readonly expectedRevision: number;
}

/**
 * The intent to change a tenant's mutable profile (IAM-001; SHR-003).
 *
 * `expectedRevision` is part of the command on purpose: an update always states
 * which state it believes is current, so there is no path that omits it and no
 * silent last-write-wins (SHR-008).
 */
export class UpdateTenant extends Command<UpdateTenantPayload> {
  public constructor(payload: UpdateTenantPayload, options?: MessageOptions) {
    super('UpdateTenant', payload, options);
  }
}
