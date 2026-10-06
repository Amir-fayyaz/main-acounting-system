import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';
import type { MembershipStatusValue } from '../../domain/value-objects/membership-status.js';

/**
 * The input `ChangeMembershipStatus` needs: the target membership, the tenant
 * it belongs to, the requested lifecycle state and the revision the caller read.
 */
export interface ChangeMembershipStatusPayload {
  readonly membershipId: string;
  readonly tenantId: string;
  readonly status: MembershipStatusValue;
  readonly expectedRevision: number;
}

/**
 * The intent to move a membership along its lifecycle (IAM-003; SHR-003).
 *
 * Activation and deactivation are the two supported transitions; which one is
 * requested is stated as the target state, and whether the move is legal from
 * the current state is decided by the domain.
 */
export class ChangeMembershipStatus extends Command<ChangeMembershipStatusPayload> {
  public constructor(payload: ChangeMembershipStatusPayload, options?: MessageOptions) {
    super('ChangeMembershipStatus', payload, options);
  }
}
