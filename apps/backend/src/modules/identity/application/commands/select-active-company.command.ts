import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/** Input for selecting the caller's active company. */
export interface SelectActiveCompanyPayload {
  /** Authenticated principal (trusted; from the guard). */
  readonly userId: string;
  /** Company to activate — from the route path only. */
  readonly tenantId: string;
}

/**
 * Intent to set the authenticated user's active company.
 * Non-members are refused with `TENANT_ACCESS_DENIED`.
 */
export class SelectActiveCompany extends Command<SelectActiveCompanyPayload> {
  public constructor(payload: SelectActiveCompanyPayload, options?: MessageOptions) {
    super('SelectActiveCompany', payload, options);
  }
}
