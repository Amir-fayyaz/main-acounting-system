import type {
  AddsAggregate,
  LoadsById,
  UpdatesAggregate,
} from '../../../../shared/persistence/repository-ports.js';
import type { User } from '../aggregates/user.js';
import type { UserId } from '../value-objects/user-id.js';

/**
 * The Identity module's repository for Users (IAM-002; SHR-004).
 *
 * It is assembled from the shared persistence capabilities
 * (`LoadsById`, `AddsAggregate`, `UpdatesAggregate`) plus the one existence
 * check the email-uniqueness invariant needs. There is no tenant criterion and
 * no tenant filter: a User is tenant-independent, so this port stays free of any
 * tenant scope (the acceptance criteria require it).
 *
 * The interface lives in `domain/`; the implementation lives in
 * `infrastructure/persistence/` and is never exposed outside this module
 * (ADR-002 section 8; enforced by `src/modules/module-boundaries.spec.ts`).
 */
export interface UserRepository
  extends LoadsById<UserId, User>, AddsAggregate<User>, UpdatesAggregate<User> {
  /** Whether a user with the given primary contact email already exists. */
  existsByEmail(email: string): Promise<boolean>;

  /** Whether a user with the given id already exists. */
  existsById(id: UserId): Promise<boolean>;
}
