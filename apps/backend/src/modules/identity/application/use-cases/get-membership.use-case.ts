import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';
import { isMembershipId, membershipIdFrom } from '../../domain/value-objects/membership-id.js';
import type { GetMembership } from '../queries/get-membership.query.js';
import { membershipNotFound, resolveMembershipTenant } from '../services/membership-scope.js';
import { toMembershipView } from '../views/membership.mapper.js';
import type { MembershipView } from '../views/membership.view.js';

/**
 * Reads one Membership by id within the caller's tenant (IAM-003).
 *
 * A query: it changes nothing, opens no transaction and records no event. It is
 * tenant-scoped — the membership it may read must belong to the tenant of the
 * current tenant context — so a caller cannot read another tenant's membership
 * by supplying an id. A malformed id and an unknown one are answered the same
 * way, so the read discloses nothing about which ids exist.
 */
export class GetMembershipUseCase {
  public constructor(private readonly repository: MembershipRepository) {}

  public async execute(query: GetMembership): Promise<Result<MembershipView, DomainError>> {
    const rawId = query.params.membershipId;
    if (!isMembershipId(rawId)) {
      return Result.fail(membershipNotFound());
    }

    const tenantId = resolveMembershipTenant(query.params.tenantId);
    if (tenantId.isFail()) {
      return Result.fail(tenantId.errorOrThrow());
    }

    const loaded = await this.repository.get(membershipIdFrom(rawId));
    if (loaded === undefined || loaded.aggregate.tenantId.value !== tenantId.valueOrThrow().value) {
      return Result.fail(membershipNotFound());
    }

    return Result.ok(toMembershipView(loaded));
  }
}
