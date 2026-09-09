import { InvalidStateError, InvalidValueError } from '@accounting-saas/ddd-core';
import { User, userId, type UserStatus } from './user.aggregate';
import { UserRegistered } from '../events/user-registered.event';
import { Email } from '../value-objects/email.vo';
import { PasswordHash } from '../value-objects/password-hash.vo';

const email = () => Email.of('Ada@example.com');
const hash = () => PasswordHash.of('$2b$12$C6UzMDM.H6dfI/f/IKcEe.WeuUQJfUdJBopCg5BxKKT6lbHNGCpFS');

const registerUser = () =>
  User.register({
    id: userId('user-1'),
    email: email(),
    displayName: '  Ada Lovelace  ',
    passwordHash: hash(),
  });

describe('User aggregate', () => {
  describe('registration factory', () => {
    it('creates an active user with normalised display name', () => {
      const user = registerUser();

      expect(user.id).toBe('user-1');
      expect(user.emailAddress).toEqual(Email.of('ada@example.com'));
      expect(user.displayName).toBe('Ada Lovelace');
      expect(user.passwordHash).toEqual(hash());
      expect(user.userStatus).toBe<UserStatus>('ACTIVE');
      expect(user.isActive).toBe(true);
    });

    it('raises exactly one UserRegistered event carrying the identity attributes', () => {
      const user = registerUser();

      const events = user.getDomainEvents();
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event).toBeInstanceOf(UserRegistered);
      const registered = event as UserRegistered;
      expect(registered.userId).toBe('user-1');
      expect(registered.email).toBe('ada@example.com');
      expect(registered.displayName).toBe('Ada Lovelace');
      expect(registered.eventName).toBe('UserRegistered');
      expect(registered.occurredAt).toBeInstanceOf(Date);
    });

    it('rejects an empty display name', () => {
      expect(() =>
        User.register({
          id: userId('user-1'),
          email: email(),
          displayName: '   ',
          passwordHash: hash(),
        }),
      ).toThrow(InvalidValueError);
    });

    it('rejects a display name longer than 120 characters', () => {
      expect(() =>
        User.register({
          id: userId('user-1'),
          email: email(),
          displayName: 'a'.repeat(121),
          passwordHash: hash(),
        }),
      ).toThrow(InvalidValueError);
    });

    it('accepts a display name of exactly 120 characters', () => {
      const user = User.register({
        id: userId('user-1'),
        email: email(),
        displayName: 'a'.repeat(120),
        passwordHash: hash(),
      });
      expect(user.displayName).toHaveLength(120);
    });
  });

  describe('changePassword', () => {
    it('replaces the stored hash with the new one', () => {
      const user = registerUser();
      const next = PasswordHash.of('$argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHQ$Zm9vYmFy');

      user.changePassword(next);

      expect(user.passwordHash).toEqual(next);
    });

    it('is a no-op when the new hash equals the current one', () => {
      const user = registerUser();

      user.changePassword(hash());

      expect(user.passwordHash).toEqual(hash());
    });

    it('rejects the change for a deactivated user', () => {
      const user = registerUser();
      user.deactivate();
      const next = PasswordHash.of('$argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHQ$Zm9vYmFy');

      expect(() => user.changePassword(next)).toThrow(InvalidStateError);
      expect(user.passwordHash).toEqual(hash());
    });
  });

  describe('deactivate', () => {
    it('flips an active user to DEACTIVATED', () => {
      const user = registerUser();

      user.deactivate();

      expect(user.userStatus).toBe<UserStatus>('DEACTIVATED');
      expect(user.isActive).toBe(false);
    });

    it('is idempotent for an already deactivated user', () => {
      const user = registerUser();
      user.deactivate();

      user.deactivate();

      expect(user.userStatus).toBe<UserStatus>('DEACTIVATED');
    });
  });

  describe('activate', () => {
    it('reactivates a deactivated user', () => {
      const user = registerUser();
      user.deactivate();

      user.activate();

      expect(user.userStatus).toBe<UserStatus>('ACTIVE');
      expect(user.isActive).toBe(true);
    });
  });

  describe('identity equality', () => {
    it('treats two users with the same id as equal regardless of state', () => {
      const a = registerUser();
      const b = registerUser();
      b.deactivate();

      expect(a).not.toBe(b);
      expect(a.equals(b)).toBe(true);
    });

    it('treats users with different ids as not equal', () => {
      const a = registerUser();
      const b = User.register({
        id: userId('user-2'),
        email: email(),
        displayName: 'Ada Lovelace',
        passwordHash: hash(),
      });

      expect(a.equals(b)).toBe(false);
    });

    it('returns false when compared against undefined', () => {
      expect(registerUser().equals(undefined)).toBe(false);
    });
  });

  describe('domain-event lifecycle', () => {
    it('exposes no events after clearEvents', () => {
      const user = registerUser();

      user.clearEvents();

      expect(user.getDomainEvents()).toHaveLength(0);
    });

    it('changePassword and deactivation record no events', () => {
      const user = registerUser();
      user.clearEvents();

      user.changePassword(PasswordHash.of('$argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHQ$Zm9vYmFy'));
      user.deactivate();

      expect(user.getDomainEvents()).toHaveLength(0);
    });
  });
});
