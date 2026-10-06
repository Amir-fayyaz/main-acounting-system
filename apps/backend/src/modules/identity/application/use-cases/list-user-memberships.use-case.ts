import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { UserNotFoundError } from '../../domain/errors/user.errors.js';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import { isUserId, userIdFrom } from '../../domain/value-objects/user-id.js';
import type { ListUserMemberships } from '../queries/list-user-memberships.query.js';
import { toMembershipView } from '../views/membership.mapper.js';
import type { MembershipView } from '../views/membership.view.js';

/**
 * Reads the memberships — and therefore the tenants — associated with a User
 * (IAM-003).
 *
 * The answer is based on actual membership state: each relationship is returned
 * with its lifecycle status, so a caller can tell an active membership from a
 * deactivated one instead of inferring it. The result is deliberately **not**
 * tenant-scoped: a person's memberships span every tenant they belong to, and
 * this read is about the person, not about any one tenant's data.
 *
 * A missing or malformed user is answered as not-found, exactly like reading the
 * user itself, so the membership read discloses nothing the user read would not.
 */
export class ListUserMembershipsUseCase {
  public constructor(
    private readonly repository: MembershipRepository,
    private readonly users: UserRepository,
  ) {}

  public async execute(
    query: ListUserMemberships,
  ): Promise<Result<readonly MembershipView[], DomainError>> {
    const rawId = query.params.userId;
    if (!isUserId(rawId)) {
      return Result.fail(new UserNotFoundError());
    }

    const id = userIdFrom(rawId);
    if (!(await this.users.existsById(id))) {
      return Result.fail(new UserNotFoundError());
    }

    const loaded = await this.repository.findByUserId(id);

    return Result.ok(loaded.map(toMembershipView));
  }
}
