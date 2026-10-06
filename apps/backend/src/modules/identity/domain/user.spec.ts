import { describe, expect, it } from 'vitest';
import { InvalidPrimitiveError } from '../../../shared/primitives/invalid-primitive-error.js';
import { DateTime } from '../../../shared/time/date-time.js';
import { User } from './aggregates/user.js';
import { InactiveUserError, InvalidUserStatusTransitionError } from './errors/user.errors.js';
import { UserEmail, USER_EMAIL_MAX_LENGTH } from './value-objects/user-email.js';
import { UserName, USER_NAME_MAX_LENGTH } from './value-objects/user-name.js';
import { UserStatus, USER_STATUS_VALUES } from './value-objects/user-status.js';

const NOW = DateTime.parse('2026-10-03T08:00:00.000Z');
const LATER = DateTime.parse('2026-10-04T08:00:00.000Z');

function newUser(displayName = 'Ali Rezaei', email = 'ali@example.com'): User {
  return User.create({ displayName, email, now: NOW });
}

describe('User aggregate', () => {
  describe('identity', () => {
    it('generates a stable, UUID-shaped identity that does not change', () => {
      const user = newUser();
      const id = user.id.value;

      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(user.id.value).toBe(id);
      expect(user.userId()).toBe(id);

      user.rename(UserName.from('Renamed'), LATER);
      user.changeEmail(UserEmail.from('renamed@example.com'), LATER);

      expect(user.id.value).toBe(id);
    });

    it('never reuses an identity for another person', () => {
      const first = newUser();
      const second = newUser();

      expect(first.id.equals(second.id)).toBe(false);
      expect(first.equals(second)).toBe(false);
    });
  });

  describe('creation', () => {
    it('starts active with both timestamps equal to the creation instant', () => {
      const user = newUser();

      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.displayName.value).toBe('Ali Rezaei');
      expect(user.email.value).toBe('ali@example.com');
      expect(user.createdAt.equals(NOW)).toBe(true);
      expect(user.updatedAt.equals(NOW)).toBe(true);
      expect(user.isActive()).toBe(true);
    });

    it('normalizes the name and the email at creation', () => {
      const user = User.create({
        displayName: '  Ali Rezaei  ',
        email: ' Ali@Example.COM ',
        now: NOW,
      });

      expect(user.displayName.value).toBe('Ali Rezaei');
      expect(user.email.value).toBe('ali@example.com');
    });

    it('rejects a blank or over-long display name', () => {
      expect(() => User.create({ displayName: '   ', email: 'ali@example.com', now: NOW })).toThrow(
        InvalidPrimitiveError,
      );
      expect(() =>
        User.create({
          displayName: 'x'.repeat(USER_NAME_MAX_LENGTH + 1),
          email: 'ali@example.com',
          now: NOW,
        }),
      ).toThrow(InvalidPrimitiveError);
    });

    it('rejects a malformed email', () => {
      expect(() => User.create({ displayName: 'Ali', email: 'not-an-email', now: NOW })).toThrow(
        InvalidPrimitiveError,
      );
    });

    it('rehydrates stored state through the same value objects', () => {
      const user = newUser();
      const rehydrated = User.rehydrate(user.snapshot());

      expect(rehydrated.id.equals(user.id)).toBe(true);
      expect(rehydrated.snapshot()).toEqual(user.snapshot());
    });

    it('rejects a stored state the value objects cannot accept', () => {
      expect(() =>
        User.rehydrate({
          id: 'not-a-uuid',
          displayName: 'Ali',
          email: 'ali@example.com',
          status: 'active',
          createdAt: NOW,
          updatedAt: NOW,
        }),
      ).toThrow(InvalidPrimitiveError);

      expect(() =>
        User.rehydrate({
          id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
          displayName: 'Ali',
          email: 'ali@example.com',
          status: 'archived' as never,
          createdAt: NOW,
          updatedAt: NOW,
        }),
      ).toThrow(InvalidPrimitiveError);
    });
  });

  describe('mutable profile attributes', () => {
    it('renames and advances only updatedAt', () => {
      const user = newUser();

      user.rename(UserName.from('New Name'), LATER);

      expect(user.displayName.value).toBe('New Name');
      expect(user.createdAt.equals(NOW)).toBe(true);
      expect(user.updatedAt.equals(LATER)).toBe(true);
    });

    it('changes the email, normalized to lower case', () => {
      const user = newUser();

      user.changeEmail(UserEmail.from('  New.Address@Example.com '), LATER);

      expect(user.email.value).toBe('new.address@example.com');
      expect(user.updatedAt.equals(LATER)).toBe(true);
    });

    it('leaves a frozen snapshot untouched by later mutations (historical safety)', () => {
      const user = newUser();
      const frozen = user.freeze();

      user.rename(UserName.from('Later Name'), LATER);

      expect(frozen.displayName).toBe('Ali Rezaei');
      expect(Object.isFrozen(frozen)).toBe(true);
    });
  });

  describe('lifecycle', () => {
    it('deactivates an active user and reactivates them', () => {
      const user = newUser();

      user.deactivate(LATER);
      expect(user.status).toBe(UserStatus.INACTIVE);
      expect(user.isActive()).toBe(false);
      expect(user.updatedAt.equals(LATER)).toBe(true);

      user.activate(LATER);
      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.isActive()).toBe(true);
    });

    it('refuses to deactivate an already inactive user', () => {
      const user = newUser();
      user.deactivate(NOW);

      expect(() => user.deactivate(LATER)).toThrow(InvalidUserStatusTransitionError);
    });

    it('refuses to activate an already active user', () => {
      const user = newUser();

      expect(() => user.activate(LATER)).toThrow(InvalidUserStatusTransitionError);
    });

    it('refuses to change attributes of an inactive user', () => {
      const user = newUser();
      user.deactivate(NOW);

      expect(() => user.rename(UserName.from('New Name'), LATER)).toThrow(InactiveUserError);
      expect(() => user.changeEmail(UserEmail.from('other@example.com'), LATER)).toThrow(
        InactiveUserError,
      );
      expect(user.displayName.value).toBe('Ali Rezaei');
      expect(user.email.value).toBe('ali@example.com');
    });

    it('reports the states it refused to move between', () => {
      const user = newUser();
      user.deactivate(NOW);

      try {
        user.deactivate(LATER);
        expect.unreachable('the transition should have been refused');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidUserStatusTransitionError);
        expect((error as InvalidUserStatusTransitionError).code).toBe(
          'INVALID_USER_STATUS_TRANSITION',
        );
      }
    });
  });

  describe('tenant independence', () => {
    it('carries no tenant, role, permission or company-specific data', () => {
      const keys = Object.keys(newUser().snapshot()).sort();

      expect(keys).toEqual(
        ['createdAt', 'displayName', 'email', 'id', 'status', 'updatedAt'].sort(),
      );
      expect(keys).not.toContain('tenantId');
      expect(keys).not.toContain('tenant');
      expect(keys).not.toContain('role');
      expect(keys).not.toContain('permissions');
      expect(keys).not.toContain('companyId');
    });
  });
});

describe('UserName', () => {
  it('trims and keeps the text', () => {
    expect(UserName.from('  Ali Rezaei  ').value).toBe('Ali Rezaei');
  });

  it('rejects blank and over-long names', () => {
    expect(() => UserName.from('   ')).toThrow(InvalidPrimitiveError);
    expect(() => UserName.from('x'.repeat(UserName.MAX_LENGTH + 1))).toThrow(InvalidPrimitiveError);
  });

  it('compares by canonical text', () => {
    expect(UserName.from(' Ali ').equals(UserName.from('Ali'))).toBe(true);
    expect(UserName.from('Ali').equals(UserName.from('Sara'))).toBe(false);
  });
});

describe('UserEmail', () => {
  it('trims and folds case', () => {
    expect(UserEmail.from('  Ali@Example.COM ').value).toBe('ali@example.com');
  });

  it('rejects blank, malformed and over-long addresses', () => {
    expect(() => UserEmail.from('  ')).toThrow(InvalidPrimitiveError);
    expect(() => UserEmail.from('not-an-email')).toThrow(InvalidPrimitiveError);
    expect(() => UserEmail.from(`${'a'.repeat(USER_EMAIL_MAX_LENGTH)}@example.com`)).toThrow(
      InvalidPrimitiveError,
    );
  });

  it('compares case-insensitively', () => {
    expect(UserEmail.from('Ali@Example.com').equals(UserEmail.from('ali@example.com'))).toBe(true);
  });
});

describe('UserStatus', () => {
  it('wraps and compares its two states', () => {
    expect(UserStatus.from('active')).toBe(UserStatus.ACTIVE);
    expect(UserStatus.from('inactive')).toBe(UserStatus.INACTIVE);
    expect(UserStatus.ACTIVE.isActive()).toBe(true);
    expect(UserStatus.INACTIVE.isInactive()).toBe(true);
    expect(USER_STATUS_VALUES).toEqual(['active', 'inactive']);
  });

  it('rejects an unknown state', () => {
    expect(() => UserStatus.from('archived' as never)).toThrow(InvalidPrimitiveError);
    expect(UserStatus.is('archived')).toBe(false);
  });
});
