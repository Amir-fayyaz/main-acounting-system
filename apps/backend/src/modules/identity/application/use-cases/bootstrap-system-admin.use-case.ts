import type { AuditRecorder } from '../../../audit/application/ports/audit-recorder.port.js';
import { Result } from '../../../../shared/errors/result.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { UserEmail } from '../../domain/value-objects/user-email.js';
import type { CredentialRepository } from '../../domain/repositories/credential.repository.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import { CreateUser } from '../commands/create-user.command.js';
import { SetUserCredential } from '../commands/set-user-credential.command.js';
import type { PlatformAuthorization } from '../ports/platform-authorization.port.js';
import type { Configuration } from '../../../../infrastructure/config/configuration.types.js';
import type { CreateUserUseCase } from './create-user.use-case.js';
import type { SetUserCredentialUseCase } from './set-user-credential.use-case.js';

/** The startup-only orchestration of the platform Product Owner identity. */
export class BootstrapSystemAdminUseCase {
  public constructor(
    private readonly users: UserRepository,
    private readonly credentials: CredentialRepository,
    private readonly platform: PlatformAuthorization,
    private readonly createUser: CreateUserUseCase,
    private readonly setCredential: SetUserCredentialUseCase,
    private readonly transactions: TransactionBoundary,
    private readonly audit: AuditRecorder,
  ) {}

  /** Provision once; an existing account is verified but never modified or promoted. */
  public async execute(config: Configuration['systemAdmin']): Promise<'created' | 'verified' | 'disabled'> {
    if (!config.enabled) return 'disabled';

    const email = UserEmail.from(config.email).value;
    const existing = await this.users.findByEmail(email);
    if (existing !== undefined) {
      return this.verifyExisting(existing.aggregate.id);
    }

    const outcome = await this.transactions.execute(async () => {
      const winner = await this.users.findByEmail(email);
      if (winner !== undefined) {
        return Result.ok<'created' | 'verified'>('verified');
      }

      const created = await this.createUser.execute(new CreateUser({
        displayName: config.displayName,
        email,
      }));
      if (created.isFail()) return Result.fail(created.errorOrThrow());

      const userId = (await this.users.findByEmail(email))?.aggregate.id;
      if (userId === undefined) throw new Error('Product Owner identity was not persisted.');

      const credential = await this.setCredential.execute(
        new SetUserCredential({ userId: userId.value, password: config.password }),
      );
      if (credential.isFail()) return Result.fail(credential.errorOrThrow());

      await this.platform.grantSystemAdmin(userId);
      await this.audit.record({
        action: 'platform.system_admin_bootstrapped',
        outcome: 'success',
        actorUserId: userId.value,
        target: { type: 'user', id: userId.value },
      });
      return Result.ok<'created' | 'verified'>('created');
    });

    if (outcome.isOk()) {
      const status = outcome.valueOrThrow();
      if (status === 'verified') {
        const winner = await this.users.findByEmail(email);
        if (winner === undefined) throw new Error('Product Owner identity was not persisted.');
        return this.verifyExisting(winner.aggregate.id);
      }
      return 'created';
    }

    // A concurrent instance may have won the database-enforced unique-email
    // race. Only a completely provisioned winner is accepted; no existing user
    // is repaired, promoted or given a new password here.
    const winner = await this.users.findByEmail(email);
    if (winner !== undefined) return this.verifyExisting(winner.aggregate.id);

    throw new Error('Product Owner bootstrap failed; resolve any conflicting identity and retry.');
  }

  private async verifyExisting(userId: import('../../domain/value-objects/user-id.js').UserId): Promise<'verified'> {
    if (
      !(await this.platform.hasSystemAdmin(userId)) ||
      (await this.credentials.get(userId)) === undefined
    ) {
      throw new Error(
        'Configured Product Owner email conflicts with an existing identity; resolve it through an audited operator workflow.',
      );
    }
    return 'verified';
  }
}
