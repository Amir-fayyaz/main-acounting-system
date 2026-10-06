import { describe, expect, it } from 'vitest';
import { EntityId } from '../../../shared/id/entity-id.js';
import { InvalidPrimitiveError } from '../../../shared/primitives/invalid-primitive-error.js';
import { DateTime } from '../../../shared/time/date-time.js';
import { Membership } from './aggregates/membership.js';
import { InvalidMembershipStatusTransitionError } from './errors/membership.errors.js';
import { MembershipStatus, MEMBERSHIP_STATUS_VALUES } from './value-objects/membership-status.js';
import { tenantReferenceFrom, type TenantReference } from './value-objects/tenant-reference.js';
import { userIdFrom, type UserId } from './value-objects/user-id.js';

const NOW = DateTime.parse('2026-10-05T08:00:00.000Z');
const LATER = DateTime.parse('2026-10-06T08:00:00.000Z');

function aUserId(): UserId {
  return userIdFrom(EntityId.generate().value);
}

function aTenantReference(): TenantReference {
  return tenantReferenceFrom(EntityId.generate().value);
}

function aMembership(userId = aUserId(), tenantId = aTenantReference()): Membership {
  return Membership.create({ userId, tenantId, now: NOW });
}

describe('Membership aggregate', () => {
  describe('identity and references', () => {
    it('generates a stable, UUID-shaped identity that does not change', () => {
      const membership = aMembership();
      const id = membership.id.value;

      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(membership.membershipId()).toBe(id);

      membership.deactivate(LATER);
      membership.activate(LATER);

      expect(membership.id.value).toBe(id);
    });

    it('never reuses an identity for another relationship', () => {
      const first = aMembership();
      const second = aMembership();

      expect(first.id.equals(second.id)).toBe(false);
      expect(first.equals(second)).toBe(false);
    });

    it('references exactly one user and one tenant, and nothing else', () => {
      const user = aUserId();
      const tenant = aTenantReference();
      const membership = aMembership(user, tenant);

      expect(membership.userId.equals(user)).toBe(true);
      expect(membership.tenantId.equals(tenant)).toBe(true);

      const keys = Object.keys(membership.snapshot()).sort();
      expect(keys).toEqual(['createdAt', 'id', 'status', 'tenantId', 'updatedAt', 'userId'].sort());
    });

    it('duplicates no user or tenant business data', () => {
      const keys = Object.keys(aMembership().snapshot());

      for (const forbidden of [
        'displayName',
        'email',
        'name',
        'tenantName',
        'role',
        'permissions',
      ]) {
        expect(keys).not.toContain(forbidden);
      }
    });
  });

  describe('creation', () => {
    it('starts active with both timestamps equal to the creation instant', () => {
      const membership = aMembership();

      expect(membership.status).toBe(MembershipStatus.ACTIVE);
      expect(membership.isActive()).toBe(true);
      expect(membership.createdAt.equals(NOW)).toBe(true);
      expect(membership.updatedAt.equals(NOW)).toBe(true);
    });

    it('accepts an explicit identity for rehydration-style construction', () => {
      const id = EntityId.generate();
      const membership = Membership.create({
        userId: aUserId(),
        tenantId: aTenantReference(),
        now: NOW,
        id,
      });

      expect(membership.id.equals(id)).toBe(true);
    });

    it('rehydrates stored state through the same value objects', () => {
      const membership = aMembership();
      const rehydrated = Membership.rehydrate(membership.snapshot());

      expect(rehydrated.id.equals(membership.id)).toBe(true);
      expect(rehydrated.snapshot()).toEqual(membership.snapshot());
    });

    it('rejects a stored state the value objects cannot accept', () => {
      const base = aMembership().snapshot();

      expect(() => Membership.rehydrate({ ...base, id: 'not-a-uuid' })).toThrow(
        InvalidPrimitiveError,
      );
      expect(() => Membership.rehydrate({ ...base, userId: 'not-a-uuid' })).toThrow(
        InvalidPrimitiveError,
      );
      expect(() => Membership.rehydrate({ ...base, tenantId: 'not-a-uuid' })).toThrow(
        InvalidPrimitiveError,
      );
      expect(() => Membership.rehydrate({ ...base, status: 'revoked' as never })).toThrow(
        InvalidPrimitiveError,
      );
    });
  });

  describe('lifecycle', () => {
    it('deactivates an active membership and reactivates it', () => {
      const membership = aMembership();

      membership.deactivate(LATER);
      expect(membership.status).toBe(MembershipStatus.INACTIVE);
      expect(membership.isActive()).toBe(false);
      expect(membership.updatedAt.equals(LATER)).toBe(true);
      expect(membership.createdAt.equals(NOW)).toBe(true);

      membership.activate(LATER);
      expect(membership.status).toBe(MembershipStatus.ACTIVE);
      expect(membership.isActive()).toBe(true);
    });

    it('refuses to deactivate an already inactive membership', () => {
      const membership = aMembership();
      membership.deactivate(NOW);

      expect(() => membership.deactivate(LATER)).toThrow(InvalidMembershipStatusTransitionError);
    });

    it('refuses to activate an already active membership', () => {
      const membership = aMembership();

      expect(() => membership.activate(LATER)).toThrow(InvalidMembershipStatusTransitionError);
    });

    it('reports the states it refused to move between', () => {
      const membership = aMembership();

      try {
        membership.activate(LATER);
        expect.unreachable('the transition should have been refused');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidMembershipStatusTransitionError);
        expect((error as InvalidMembershipStatusTransitionError).code).toBe(
          'INVALID_MEMBERSHIP_STATUS_TRANSITION',
        );
      }
    });

    it('preserves the record across deactivation (historical safety)', () => {
      const membership = aMembership();
      const before = membership.snapshot();

      membership.deactivate(LATER);

      // The relationship is now inactive, but the record is intact: the same
      // identity, the same references and the same creation instant.
      expect(membership.id.value).toBe(before.id);
      expect(membership.userId.value).toBe(before.userId);
      expect(membership.tenantId.value).toBe(before.tenantId);
      expect(membership.createdAt.equals(before.createdAt)).toBe(true);
      expect(membership.status.value).toBe('inactive');
    });

    it('leaves a frozen snapshot untouched by a later change', () => {
      const membership = aMembership();
      const frozen = membership.freeze();

      membership.deactivate(LATER);

      expect(frozen.status).toBe('active');
      expect(Object.isFrozen(frozen)).toBe(true);
    });
  });
});

describe('MembershipStatus', () => {
  it('wraps and compares its two states', () => {
    expect(MembershipStatus.from('active')).toBe(MembershipStatus.ACTIVE);
    expect(MembershipStatus.from('inactive')).toBe(MembershipStatus.INACTIVE);
    expect(MembershipStatus.ACTIVE.isActive()).toBe(true);
    expect(MembershipStatus.INACTIVE.isInactive()).toBe(true);
    expect(MEMBERSHIP_STATUS_VALUES).toEqual(['active', 'inactive']);
  });

  it('rejects an unknown state', () => {
    expect(() => MembershipStatus.from('revoked' as never)).toThrow(InvalidPrimitiveError);
    expect(MembershipStatus.is('revoked')).toBe(false);
  });
});
