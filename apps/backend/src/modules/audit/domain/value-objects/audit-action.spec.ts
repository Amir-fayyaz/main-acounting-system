import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import { AUDIT_ACTION_MAX_LENGTH, AuditAction } from './audit-action.js';

/**
 * The stable action-name rule (AUD-001).
 *
 * What matters is that the *form* of an action name is enforced rather than
 * assumed — the module does not define which actions exist, so the only thing it
 * can guarantee is that a name is a dotted, lower-case, module-qualified one.
 * The examples below are the vocabulary the issue itself gives, so the rule is
 * pinned against the names the product actually expects to record.
 */

describe('AuditAction — the naming convention', () => {
  it.each([
    'user.signed_in',
    'user.signed_out',
    'authorization.denied',
    'company.created',
    'company.updated',
    'membership.changed',
    'purchase.created',
    'purchase.approved',
    'accounting.document.posted',
  ])('accepts the stable action name %s', (name) => {
    expect(AuditAction.from(name).value).toBe(name);
    expect(AuditAction.is(name)).toBe(true);
  });

  it('normalizes case and surrounding whitespace', () => {
    expect(AuditAction.from('  User.Signed_In  ').value).toBe('user.signed_in');
  });

  it('rejects a name with no module qualifier', () => {
    // A single segment would let two capabilities record the same word for
    // different things, which is exactly what the dotted form prevents.
    expect(() => AuditAction.from('signed_in')).toThrow(InvalidPrimitiveError);
  });

  it.each(['user..signedIn', 'user signed_in', '.user.signed_in', 'user.', 'user.$signed'])(
    'rejects the malformed name %s',
    (name) => {
      expect(() => AuditAction.from(name)).toThrow(InvalidPrimitiveError);
      expect(AuditAction.is(name)).toBe(false);
    },
  );

  it('rejects an empty name', () => {
    expect(() => AuditAction.from('')).toThrow(InvalidPrimitiveError);
    expect(() => AuditAction.from('   ')).toThrow(InvalidPrimitiveError);
    expect(AuditAction.is('')).toBe(false);
  });

  it('rejects a name longer than the storage bound', () => {
    const long = `user.${'a'.repeat(AUDIT_ACTION_MAX_LENGTH)}`;

    expect(() => AuditAction.from(long)).toThrow(InvalidPrimitiveError);
    expect(AuditAction.is(long)).toBe(false);
  });

  it('is not fooled by a non-string', () => {
    expect(() => AuditAction.from(undefined as unknown as string)).toThrow(InvalidPrimitiveError);
    expect(AuditAction.is(42)).toBe(false);
  });

  it('compares by name', () => {
    expect(AuditAction.from('user.signed_in').equals(AuditAction.from('USER.SIGNED_IN'))).toBe(
      true,
    );
    expect(AuditAction.from('user.signed_in').equals(AuditAction.from('user.signed_out'))).toBe(
      false,
    );
  });
});
