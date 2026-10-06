import type { Loaded } from '../../../../shared/persistence/repository-ports.js';
import type { User } from '../../domain/aggregates/user.js';
import type { UserView } from './user.view.js';

/**
 * Maps loaded domain state to the application view (IAM-002).
 *
 * The mapping is one-way and total: it reads the aggregate and its revision and
 * produces plain values. Nothing here can write back into the aggregate, and a
 * caller that wants to change something must go through a use case.
 */
export function toUserView(loaded: Loaded<User>): UserView {
  const { aggregate: user, revision } = loaded;

  return {
    id: user.id.value,
    displayName: user.displayName.value,
    email: user.email.value,
    status: user.status.value,
    revision: revision.value,
    createdAt: user.createdAt.toIsoString(),
    updatedAt: user.updatedAt.toIsoString(),
  };
}
