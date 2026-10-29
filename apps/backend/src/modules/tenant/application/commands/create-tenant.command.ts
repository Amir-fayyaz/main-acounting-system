import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/** The input `CreateTenant` needs: the name and the user who creates it. */
export interface CreateTenantPayload {
  readonly name: string;
  /**
   * The authenticated creator. Their membership in the new company is created
   * in the same transaction, so a company never exists without someone able to
   * administer it (IAM-009).
   */
  readonly ownerUserId: string;
}

/**
 * The intent to create a tenant (IAM-001; IAM-009; SHR-003).
 *
 * A command states *what should happen* and carries the input, never a result
 * and never a transport. Creating a tenant has no tenant yet — the tenant
 * *is* the new boundary — so no tenant scope is threaded through it; the
 * application runs it as a system-level operation.
 *
 * `ownerUserId` is the verified caller's identity, not a client choice: the
 * controller takes it from the authenticated principal, and the use case uses
 * it only to enroll that user in the company it is creating.
 */
export class CreateTenant extends Command<CreateTenantPayload> {
  public constructor(payload: CreateTenantPayload, options?: MessageOptions) {
    super('CreateTenant', payload, options);
  }
}
