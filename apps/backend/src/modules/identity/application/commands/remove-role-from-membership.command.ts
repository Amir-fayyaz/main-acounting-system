import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/**
 * The input `RemoveRoleFromMembership` needs: the tenant, the membership, the
 * assignment to end and the revision the caller read.
 *
 * Removal is identified by the assignment — not by the role — so it is
 * unambiguous even after the role's lifecycle moved, and it names the revision
 * it expects, so a removal prepared against a stale read is refused.
 */
export interface RemoveRoleFromMembershipPayload {
  readonly tenantId: string;
  readonly membershipId: string;
  readonly assignmentId: string;
  readonly expectedRevision: number;
}

/** The intent to remove a Role from a Membership (IAM-004; SHR-003). */
export class RemoveRoleFromMembership extends Command<RemoveRoleFromMembershipPayload> {
  public constructor(payload: RemoveRoleFromMembershipPayload, options?: MessageOptions) {
    super('RemoveRoleFromMembership', payload, options);
  }
}
