import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/**
 * The input `SelectActiveCompany` needs: who is selecting and which company
 * they selected.
 *
 * The user is the authenticated principal the boundary resolved, and the
 * company is the route identifier the authorization boundary verified against
 * that user's membership. Neither is trusted from the other's position: the
 * use case re-checks the membership before it stores the preference.
 */
export interface SelectActiveCompanyPayload {
  readonly userId: string;
  readonly tenantId: string;
}

/** The intent to make one company the caller's active company (IAM-009). */
export class SelectActiveCompany extends Command<SelectActiveCompanyPayload> {
  public constructor(payload: SelectActiveCompanyPayload, options?: MessageOptions) {
    super('SelectActiveCompany', payload, options);
  }
}
