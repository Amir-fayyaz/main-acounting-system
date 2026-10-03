import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/** The input `CreateTenant` needs: the name the new tenant starts with. */
export interface CreateTenantPayload {
  readonly name: string;
}

/**
 * The intent to create a tenant (IAM-001; SHR-003).
 *
 * A command states *what should happen* and carries the input, never a result
 * and never a transport. Creating a tenant has no tenant yet — the tenant
 * *is* the new boundary — so no tenant scope is threaded through it; the
 * application runs it as a system-level operation.
 */
export class CreateTenant extends Command<CreateTenantPayload> {
  public constructor(payload: CreateTenantPayload, options?: MessageOptions) {
    super('CreateTenant', payload, options);
  }
}
