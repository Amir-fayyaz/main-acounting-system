import type {
  AddsAggregate,
  LoadsById,
  UpdatesAggregate,
} from '../../../../shared/persistence/repository-ports.js';
import type { Credential } from '../aggregates/credential.js';
import type { UserId } from '../value-objects/user-id.js';

/**
 * The Identity module's repository for Credentials (IAM-005; SHR-004).
 *
 * The port is exactly the three shared capabilities and nothing else: read by
 * user, establish, replace. That is not an oversight — the credential's
 * identity *is* its user's identity, so:
 *
 * - there is no "find by email" here: the user lookup belongs to the user
 *   repository, and authentication goes *user first, credential second* so a
 *   credential read can never be a second way to enumerate identities;
 * - there is no delete and no upsert: a credential is replaced through
 *   `update` against the revision it was read at, so a concurrent rotation is
 *   refused instead of silently winning;
 * - there is no listing and no count: credentials are never enumerated, because
 *   an endpoint or job that could list them could leak which accounts have one.
 *
 * Declared as a composition rather than an interface with new members, so the
 * port cannot grow an operation that was not decided: a read the authentication
 * flow does not need has to be added here deliberately.
 *
 * The type lives in `domain/`; the implementation lives in
 * `infrastructure/persistence/` and is never exposed outside this module
 * (ADR-002 section 8; enforced by `src/modules/module-boundaries.spec.ts`).
 */
export type CredentialRepository = LoadsById<UserId, Credential> &
  AddsAggregate<Credential> &
  UpdatesAggregate<Credential>;
