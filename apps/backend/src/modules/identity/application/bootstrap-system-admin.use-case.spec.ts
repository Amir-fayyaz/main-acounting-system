import { describe, expect, it, vi } from 'vitest';
import { Result } from '../../../shared/errors/result.js';
import { aUser, InMemoryUserRepository, PassthroughTransactionBoundary } from '../../../../test/support/user-doubles.js';
import type { AuditRecorder } from '../../audit/application/ports/audit-recorder.port.js';
import type { CredentialRepository } from '../domain/repositories/credential.repository.js';
import type { PlatformAuthorization } from './ports/platform-authorization.port.js';
import type { UserRepository } from '../domain/repositories/user.repository.js';
import type { CreateUserUseCase } from './use-cases/create-user.use-case.js';
import type { SetUserCredentialUseCase } from './use-cases/set-user-credential.use-case.js';
import { BootstrapSystemAdminUseCase } from './use-cases/bootstrap-system-admin.use-case.js';

const config = {
  enabled: true,
  email: 'owner@example.test',
  password: 'Secret-password-123!',
  displayName: 'Product Owner',
} as const;

function harness() {
  const user = aUser('Product Owner', config.email);
  const users = new InMemoryUserRepository();
  const grants = new Set<string>();
  let credentialExists = false;
  const credentials = {
    async get() {
      return credentialExists ? ({ aggregate: {} } as never) : undefined;
    },
  } as unknown as CredentialRepository;
  const platform: PlatformAuthorization = {
    hasSystemAdmin: async (id) => grants.has(id.value),
    grantSystemAdmin: async (id) => { grants.add(id.value); },
  };
  const createUser = {
    execute: vi.fn(async () => Result.ok({ id: user.id.value } as never)),
  } as unknown as CreateUserUseCase;
  const setCredential = {
    execute: vi.fn(async () => {
      credentialExists = true;
      return Result.ok(undefined);
    }),
  } as unknown as SetUserCredentialUseCase;
  const audit: AuditRecorder = { record: vi.fn(async () => undefined) };
  const bootstrap = new BootstrapSystemAdminUseCase(
    users as unknown as UserRepository,
    credentials,
    platform,
    createUser,
    setCredential,
    new PassthroughTransactionBoundary(),
    audit,
  );

  return {
    user,
    users,
    grants,
    createUser,
    setCredential,
    audit,
    bootstrap,
    setCredentialExists: (value: boolean) => { credentialExists = value; },
  };
}

describe('BootstrapSystemAdminUseCase', () => {
  it('does nothing when bootstrap is disabled', async () => {
    const app = harness();
    await expect(app.bootstrap.execute({ ...config, enabled: false })).resolves.toBe('disabled');
    expect(app.createUser.execute).not.toHaveBeenCalled();
  });

  it('creates the configured identity, credential, platform grant and audit record', async () => {
    const app = harness();
    vi.spyOn(app.users, 'findByEmail')
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ aggregate: app.user, revision: { value: 1 } as never });

    await expect(app.bootstrap.execute(config)).resolves.toBe('created');
    expect(app.createUser.execute).toHaveBeenCalledOnce();
    expect(app.setCredential.execute).toHaveBeenCalledOnce();
    expect(app.grants.has(app.user.id.value)).toBe(true);
    expect(app.audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'platform.system_admin_bootstrapped',
      actorUserId: app.user.id.value,
    }));
  });

  it('verifies an existing fully provisioned Product Owner without resetting credentials', async () => {
    const app = harness();
    app.users.seed(app.user);
    app.grants.add(app.user.id.value);
    app.setCredentialExists(true);

    await expect(app.bootstrap.execute(config)).resolves.toBe('verified');
    expect(app.createUser.execute).not.toHaveBeenCalled();
    expect(app.setCredential.execute).not.toHaveBeenCalled();
  });

  it('refuses to take over or promote an existing user', async () => {
    const app = harness();
    app.users.seed(app.user);

    await expect(app.bootstrap.execute(config)).rejects.toThrow(/conflicts with an existing identity/);
    expect(app.grants.has(app.user.id.value)).toBe(false);
    expect(app.setCredential.execute).not.toHaveBeenCalled();
  });

  it('fails safely when credential provisioning fails', async () => {
    const app = harness();
    vi.spyOn(app.users, 'findByEmail')
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ aggregate: app.user, revision: { value: 1 } as never });
    vi.mocked(app.setCredential.execute).mockResolvedValueOnce(Result.fail({} as never));

    await expect(app.bootstrap.execute(config)).rejects.toThrow(/bootstrap failed/);
    expect(app.grants.size).toBe(0);
    expect(app.audit.record).not.toHaveBeenCalled();
  });

  it('does not expose the configured password in a propagated provisioning error', async () => {
    const app = harness();
    vi.mocked(app.createUser.execute).mockRejectedValueOnce(new Error('provisioning failed'));

    await expect(app.bootstrap.execute(config)).rejects.not.toThrow(config.password);
  });
});
