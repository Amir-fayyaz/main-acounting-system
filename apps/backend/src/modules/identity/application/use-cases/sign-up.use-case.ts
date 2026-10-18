import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { causedBy } from '../../../../shared/messaging/message.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { CreateUser } from '../commands/create-user.command.js';
import { SetUserCredential } from '../commands/set-user-credential.command.js';
import type { SignUp } from '../commands/sign-up.command.js';
import { parsePlainPassword } from '../services/authentication-input.js';
import { parseDisplayName, parseUserEmail } from '../services/user-input.js';
import type { CreateUserUseCase } from './create-user.use-case.js';
import type { SetUserCredentialUseCase } from './set-user-credential.use-case.js';
import type { SignedUpView } from '../views/signed-up.view.js';

/**
 * Self-service registration: an identity *and* the credential that lets it sign
 * in, established together (IAM-008; ADR-010 section 2; SHR-005).
 *
 * The use case owns the registration contract and is deliberately thin about
 * everything else. It invents no second way to create a user and no second
 * credential mechanism — a sign-up is exactly the composition the two existing
 * boundaries already implement:
 *
 * - **The User is created through the User Management boundary** (IAM-002):
 *   the display name and email are validated and normalized there, the email
 *   uniqueness invariant (application pre-check *and* the persistence-layer
 *   unique key) is enforced there, and `UserCreated` is recorded in the outbox
 *   there.
 * - **The credential is established through the Authentication boundary**
 *   (IAM-005): the raw secret is validated against the password policy and
 *   hashed by the approved password-hashing port there, the hash is persisted
 *   through the credential repository there, and `UserCredentialEstablished`
 *   is stated to the central audit trail there (AUD-001). No password, no hash
 *   and no credential record ever appears in this use case's result.
 *
 * Because a sign-up that leaves a user without a credential — or a credential
 * without its user — is an inconsistent registration, the two delegations run
 * inside **one** transaction boundary this use case opens: the inner operations
 * join it (never fork it), so a failed credential establishment rolls the user
 * creation back with it, and a duplicate email prevents the credential from
 * being established at all. A business failure surfaces as the `Result` the
 * failing boundary already produced; an unexpected persistence error keeps
 * propagating as a thrown technical failure, which rolls this boundary back on
 * its way out — so neither half of a registration can commit alone.
 *
 * Nothing here reaches a membership, role, permission, tenant or Company:
 * sign-up is identity plus authentication, and access is granted by other use
 * cases. The email a caller submits is the public contact of an identity, and a
 * duplicate is answered with the same conflict contract `CreateUser` already
 * uses — no second error vocabulary is introduced for it.
 */
export class SignUpUseCase {
  public constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly setCredential: SetUserCredentialUseCase,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: SignUp): Promise<Result<SignedUpView, DomainError>> {
    // Validation first, in the vocabulary each domain already speaks: identity
    // fields as the user-management parser validates them, the secret as the
    // authentication parser does. All three must pass before anything is
    // created, so a rejected request writes no state at all.
    const displayName = parseDisplayName(command.payload.displayName);
    if (displayName.isFail()) {
      return Result.fail(displayName.errorOrThrow());
    }

    const email = parseUserEmail(command.payload.email);
    if (email.isFail()) {
      return Result.fail(email.errorOrThrow());
    }

    const password = parsePlainPassword(command.payload.password);
    if (password.isFail()) {
      return Result.fail(password.errorOrThrow());
    }

    return this.boundary.execute<Result<SignedUpView, DomainError>>(async () => {
      // The user is created through the User Management boundary. Its own
      // `execute` joins the boundary this use case opened, so its insert, its
      // uniqueness checks and its outbox record participate in this unit of
      // work rather than committing as a separate one.
      const created = await this.createUser.execute(
        new CreateUser(
          {
            displayName: displayName.valueOrThrow().value,
            email: email.valueOrThrow().value,
          },
          causedBy(command),
        ),
      );

      if (created.isFail()) {
        // A rejected user (a duplicate email above all) refuses the whole
        // registration; nothing has been written yet.
        return created;
      }
      const user = created.valueOrThrow();

      // The credential is established through the Authentication boundary,
      // which validates the secret against the policy and derives the stored
      // hash through the approved hashing port. The raw secret lives only in
      // the command's payload, never in any value this use case keeps. An
      // unexpected failure below throws: the open boundary rolls the user
      // creation back with it, leaving no user whose credential is missing.
      const credential = await this.setCredential.execute(
        new SetUserCredential(
          { userId: user.id, password: password.valueOrThrow().reveal() },
          causedBy(command),
        ),
      );

      if (credential.isFail()) {
        // A refused credential rolls everything back: the user this boundary
        // just inserted commits with the credential or not at all, so no
        // registration can end "user exists, cannot sign in".
        return Result.fail(credential.errorOrThrow());
      }

      // The response is the public shape of the user the caller registered.
      // No credential view is returned: what sign-up proves is that the user
      // exists; the sign-in resource answers whether the secret works.
      return Result.ok(user);
    });
  }
}
