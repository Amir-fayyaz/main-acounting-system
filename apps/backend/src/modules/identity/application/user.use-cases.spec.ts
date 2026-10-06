import { describe, expect, it } from 'vitest';
import { ConflictError } from '../../../shared/errors/category-errors.js';
import { EntityId } from '../../../shared/id/entity-id.js';
import { Revision } from '../../../shared/persistence/revision.js';
import {
  InMemoryUserRepository,
  PassthroughTransactionBoundary,
  RecordingUserEvents,
  aUser,
} from '../../../../test/support/user-doubles.js';
import { userIdFrom } from '../domain/value-objects/user-id.js';
import { ChangeUserStatus } from './commands/change-user-status.command.js';
import { CreateUser } from './commands/create-user.command.js';
import { UpdateUser } from './commands/update-user.command.js';
import { GetUser } from './queries/get-user.query.js';
import { ChangeUserStatusUseCase } from './use-cases/change-user-status.use-case.js';
import { CreateUserUseCase } from './use-cases/create-user.use-case.js';
import { GetUserUseCase } from './use-cases/get-user.use-case.js';
import { UpdateUserUseCase } from './use-cases/update-user.use-case.js';

interface Harness {
  readonly repository: InMemoryUserRepository;
  readonly events: RecordingUserEvents;
  readonly boundary: PassthroughTransactionBoundary;
  readonly createUser: CreateUserUseCase;
  readonly getUser: GetUserUseCase;
  readonly updateUser: UpdateUserUseCase;
  readonly changeUserStatus: ChangeUserStatusUseCase;
}

function harness(): Harness {
  const repository = new InMemoryUserRepository();
  const events = new RecordingUserEvents();
  const boundary = new PassthroughTransactionBoundary();

  return {
    repository,
    events,
    boundary,
    createUser: new CreateUserUseCase(repository, events, boundary),
    getUser: new GetUserUseCase(repository),
    updateUser: new UpdateUserUseCase(repository, events, boundary),
    changeUserStatus: new ChangeUserStatusUseCase(repository, events, boundary),
  };
}

function randomUserId(): string {
  return EntityId.generate().value;
}

describe('user use cases', () => {
  describe('create', () => {
    it('creates an active user, persists it and records UserCreated', async () => {
      const app = harness();

      const outcome = await app.createUser.execute(
        new CreateUser({ displayName: '  Ali Rezaei  ', email: ' Ali@Example.COM ' }),
      );

      expect(outcome.isOk()).toBe(true);
      const view = outcome.valueOrThrow();
      expect(view.displayName).toBe('Ali Rezaei');
      expect(view.email).toBe('ali@example.com');
      expect(view.status).toBe('active');
      expect(view.revision).toBe(1);
      expect(view.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(view.createdAt).toBe(view.updatedAt);
      expect(app.repository.addCalls).toBe(1);
      expect(app.repository.revisionOf(userIdFrom(view.id))?.value).toBe(1);

      expect(app.events.recorded).toHaveLength(1);
      expect(app.events.recorded[0]?.name).toBe('UserCreated');
      // A user is tenant-independent: the fact carries no tenant.
      expect(app.events.recorded[0]?.metadata.tenantId).toBeUndefined();
    });

    it('rejects a blank name as an expected failure without persisting', async () => {
      const app = harness();

      const outcome = await app.createUser.execute(
        new CreateUser({ displayName: '   ', email: 'ali@example.com' }),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('VALIDATION_FAILED');
      expect(app.repository.addCalls).toBe(0);
      expect(app.events.recorded).toEqual([]);
    });

    it('rejects a malformed email as an expected failure without persisting', async () => {
      const app = harness();

      const outcome = await app.createUser.execute(
        new CreateUser({ displayName: 'Ali', email: 'not-an-email' }),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('VALIDATION_FAILED');
      expect(app.repository.addCalls).toBe(0);
    });

    it('refuses a duplicate email with the conflict contract', async () => {
      const app = harness();
      await app.createUser.execute(
        new CreateUser({ displayName: 'First', email: 'shared@example.com' }),
      );

      const outcome = await app.createUser.execute(
        new CreateUser({ displayName: 'Second', email: 'SHARED@example.com' }),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('DUPLICATE_USER');
      expect(outcome.errorOrThrow().category).toBe('CONFLICT');
      expect(app.repository.addCalls).toBe(1);
    });
  });

  describe('get', () => {
    it('reads a user by identity', async () => {
      const app = harness();
      const user = aUser('Sara Ahmadi', 'sara@example.com');
      app.repository.seed(user);

      const outcome = await app.getUser.execute(new GetUser({ userId: user.id.value }));

      expect(outcome.valueOrThrow()).toMatchObject({
        id: user.id.value,
        displayName: 'Sara Ahmadi',
        email: 'sara@example.com',
        status: 'active',
        revision: 1,
      });
    });

    it('answers not-found for an unknown user', async () => {
      const app = harness();

      const outcome = await app.getUser.execute(new GetUser({ userId: randomUserId() }));

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('USER_NOT_FOUND');
    });

    it('treats a malformed identity as not-found', async () => {
      const app = harness();

      const outcome = await app.getUser.execute(new GetUser({ userId: 'not-a-uuid' }));

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('USER_NOT_FOUND');
    });
  });

  describe('update', () => {
    it('renames a user, advances the revision and records the change', async () => {
      const app = harness();
      const user = aUser('Old Name');
      app.repository.seed(user);

      const outcome = await app.updateUser.execute(
        new UpdateUser({ userId: user.id.value, displayName: 'New Name', expectedRevision: 1 }),
      );

      expect(outcome.valueOrThrow()).toMatchObject({ displayName: 'New Name', revision: 2 });
      expect(app.repository.stored(user.id)?.displayName.value).toBe('New Name');
      expect(app.events.recorded[0]?.name).toBe('UserProfileUpdated');
    });

    it('changes the primary contact email', async () => {
      const app = harness();
      const user = aUser('Ali', 'old@example.com');
      app.repository.seed(user);

      const outcome = await app.updateUser.execute(
        new UpdateUser({ userId: user.id.value, email: 'New@Example.com', expectedRevision: 1 }),
      );

      expect(outcome.valueOrThrow()).toMatchObject({ email: 'new@example.com', revision: 2 });
      expect(app.repository.stored(user.id)?.email.value).toBe('new@example.com');
    });

    it('does not advance the revision when nothing actually changes', async () => {
      const app = harness();
      const user = aUser('Ali', 'ali@example.com');
      app.repository.seed(user);

      const outcome = await app.updateUser.execute(
        new UpdateUser({ userId: user.id.value, email: 'ALI@example.com', expectedRevision: 1 }),
      );

      expect(outcome.valueOrThrow().revision).toBe(1);
      expect(app.repository.updateCalls).toBe(0);
      expect(app.events.recorded).toEqual([]);
    });

    it('refuses to change an inactive user and keeps the record', async () => {
      const app = harness();
      const user = aUser('Ali');
      app.repository.seed(user);
      await app.changeUserStatus.execute(
        new ChangeUserStatus({ userId: user.id.value, status: 'inactive', expectedRevision: 1 }),
      );

      const outcome = await app.updateUser.execute(
        new UpdateUser({
          userId: user.id.value,
          displayName: 'Should Not Apply',
          expectedRevision: 2,
        }),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('USER_INACTIVE');
      expect(app.repository.stored(user.id)?.displayName.value).toBe('Ali');
    });

    it('requires at least one mutable attribute', async () => {
      const app = harness();
      const user = aUser();
      app.repository.seed(user);

      const outcome = await app.updateUser.execute(
        new UpdateUser({ userId: user.id.value, expectedRevision: 1 }),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('VALIDATION_FAILED');
    });

    it('rejects an unknown user', async () => {
      const app = harness();

      const outcome = await app.updateUser.execute(
        new UpdateUser({ userId: randomUserId(), displayName: 'Nobody', expectedRevision: 1 }),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('USER_NOT_FOUND');
    });

    it('detects a conflicting concurrent update and keeps the winner', async () => {
      const app = harness();
      const user = aUser('Original');
      app.repository.seed(user, Revision.initial());

      const first = await app.updateUser.execute(
        new UpdateUser({ userId: user.id.value, displayName: 'First Writer', expectedRevision: 1 }),
      );
      const second = await app.updateUser.execute(
        new UpdateUser({
          userId: user.id.value,
          displayName: 'Second Writer',
          expectedRevision: 1,
        }),
      );

      expect(first.isOk()).toBe(true);
      expect(second.isFail()).toBe(true);
      expect(second.errorOrThrow()).toBeInstanceOf(ConflictError);

      // The winner stands, the revision moved exactly once, and no mutation was
      // retried.
      expect(app.repository.stored(user.id)?.displayName.value).toBe('First Writer');
      expect(app.repository.revisionOf(user.id)?.value).toBe(2);
      expect(app.repository.updateCalls).toBe(2);
    });

    it('rejects a stale expected revision that is not a positive integer', async () => {
      const app = harness();
      const user = aUser();
      app.repository.seed(user);

      const outcome = await app.updateUser.execute(
        new UpdateUser({ userId: user.id.value, displayName: 'X', expectedRevision: 0 }),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('VALIDATION_FAILED');
      expect(app.repository.updateCalls).toBe(0);
    });
  });

  describe('change status', () => {
    it('moves active -> inactive and records the transition without a tenant', async () => {
      const app = harness();
      const user = aUser();
      app.repository.seed(user);

      const outcome = await app.changeUserStatus.execute(
        new ChangeUserStatus({ userId: user.id.value, status: 'inactive', expectedRevision: 1 }),
      );

      expect(outcome.valueOrThrow()).toMatchObject({ status: 'inactive', revision: 2 });
      expect(app.events.recorded[0]?.name).toBe('UserStatusChanged');
      expect(app.events.recorded[0]?.metadata.tenantId).toBeUndefined();
    });

    it('moves inactive -> active again', async () => {
      const app = harness();
      const user = aUser();
      app.repository.seed(user);
      await app.changeUserStatus.execute(
        new ChangeUserStatus({ userId: user.id.value, status: 'inactive', expectedRevision: 1 }),
      );

      const outcome = await app.changeUserStatus.execute(
        new ChangeUserStatus({ userId: user.id.value, status: 'active', expectedRevision: 2 }),
      );

      expect(outcome.valueOrThrow()).toMatchObject({ status: 'active', revision: 3 });
    });

    it('rejects an invalid transition', async () => {
      const app = harness();
      const user = aUser();
      app.repository.seed(user);

      // Already active: moving to active again is not a transition.
      const outcome = await app.changeUserStatus.execute(
        new ChangeUserStatus({ userId: user.id.value, status: 'active', expectedRevision: 1 }),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('INVALID_USER_STATUS_TRANSITION');
      expect(app.repository.stored(user.id)?.status.value).toBe('active');
      expect(app.repository.updateCalls).toBe(0);
    });

    it('rejects an unknown status as an expected validation failure', async () => {
      const app = harness();
      const user = aUser();
      app.repository.seed(user);

      const outcome = await app.changeUserStatus.execute(
        new ChangeUserStatus({
          userId: user.id.value,
          status: 'archived' as never,
          expectedRevision: 1,
        }),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('VALIDATION_FAILED');
    });

    it('detects a conflicting concurrent status change', async () => {
      const app = harness();
      const user = aUser();
      app.repository.seed(user);

      await app.updateUser.execute(
        new UpdateUser({ userId: user.id.value, displayName: 'Renamed', expectedRevision: 1 }),
      );
      const stale = await app.changeUserStatus.execute(
        new ChangeUserStatus({ userId: user.id.value, status: 'inactive', expectedRevision: 1 }),
      );

      expect(stale.isFail()).toBe(true);
      expect(stale.errorOrThrow()).toBeInstanceOf(ConflictError);
      expect(app.repository.stored(user.id)?.status.value).toBe('active');
    });
  });
});
