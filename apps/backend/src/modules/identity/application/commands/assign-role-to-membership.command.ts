import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/**
 * The input `AssignRoleToMembership` needs: the tenant, the membership that
 * receives the role, and the role.
 *
 * The tenant is part of the payload because it is the boundary the operation
 * runs under — the use case checks it against the resolved tenant scope, and
 * both the membership and the role must belong to it, so a cross-tenant
 * assignment is refused.
 */
export interface AssignRoleToMembershipPayload {
  readonly tenantId: string;
  readonly membershipId: string;
  readonly roleId: string;
}

/** The intent to give a Membership a Role of the same Tenant (IAM-004; SHR-003). */
export class AssignRoleToMembership extends Command<AssignRoleToMembershipPayload> {
  public constructor(payload: AssignRoleToMembershipPayload, options?: MessageOptions) {
    super('AssignRoleToMembership', payload, options);
  }
}
