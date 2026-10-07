import type {
  AddsAggregate,
  Loaded,
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

  /**
   * The user with the given primary contact email, or `undefined` when none has it.
   *
   * Added by IAM-005 as the one criterion authentication needs: sign-in starts
   * from the identifier a user presents, so this is the closed lookup that turns
   * an email into a user — and it is deliberately in *this* port rather than in
   * the credential repository, so the credential store never becomes a second
   * index of identities. Like every read here it applies no tenant criterion: a
   * user is tenant-independent. The email is normalized by the caller (the
   * `UserEmail` value object) and by the adapter, so case never decides whether
   * an account is found.
   */
  findByEmail(email: string): Promise<Loaded<User> | undefined>;

  /** Whether a user with the given id already exists. */
  existsById(id: UserId): Promise<boolean>;
}
