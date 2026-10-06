import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { UserNotFoundError } from '../../domain/errors/user.errors.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import { isUserId, userIdFrom } from '../../domain/value-objects/user-id.js';
import type { GetUser } from '../queries/get-user.query.js';
import { toUserView } from '../views/user.mapper.js';
import type { UserView } from '../views/user.view.js';

/**
 * Reads one User by id (IAM-002).
 *
 * A query: it changes nothing, opens no transaction and records no event. It is
 * deliberately **not** tenant-scoped — a User is a tenant-independent identity,
 * so no tenant criterion is applied and none is read from the ambient context.
 * A malformed id is answered as not-found, exactly like an unknown one, so the
 * read discloses nothing about which ids exist.
 */
export class GetUserUseCase {
  public constructor(private readonly repository: UserRepository) {}

  public async execute(query: GetUser): Promise<Result<UserView, DomainError>> {
    const rawId = query.params.userId;
    if (!isUserId(rawId)) {
      return Result.fail(new UserNotFoundError());
    }

    const loaded = await this.repository.get(userIdFrom(rawId));
    if (loaded === undefined) {
      return Result.fail(new UserNotFoundError());
    }

    return Result.ok(toUserView(loaded));
  }
}
