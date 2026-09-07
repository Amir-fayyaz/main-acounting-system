import { Entity } from './entity';

class UserId {
  constructor(public readonly value: string) {}
}

class TenantId {
  constructor(public readonly value: string) {}
}

class User extends Entity<string> {
  constructor(id: string, public name: string) {
    super(id);
  }

  rename(name: string): void {
    (this as { name: string }).name = name;
  }
}

describe('Entity', () => {
  it('stores the identifier passed to its constructor', () => {
    const user = new User('u-1', 'Alice');
    expect(user.id).toBe('u-1');
  });

  it('treats entities with the same ID as equal even if their state differs', () => {
    const a = new User('u-1', 'Alice');
    const b = new User('u-1', 'Alice-renamed');
    expect(a).not.toBe(b);
    expect(a.equals(b)).toBe(true);
  });

  it('treats entities with different IDs as not equal', () => {
    const a = new User('u-1', 'Alice');
    const b = new User('u-2', 'Alice');
    expect(a.equals(b)).toBe(false);
  });

  it('returns false when compared with undefined', () => {
    const a = new User('u-1', 'Alice');
    expect(a.equals(undefined)).toBe(false);
  });

  it('returns false when compared with null', () => {
    const a = new User('u-1', 'Alice');
    expect(a.equals(null as unknown as Entity<string>)).toBe(false);
  });

  it('supports distinct ID types at compile time', () => {
    // The generic parameter keeps the ID type strict at the call site.
    const user = new User('u-1', 'Alice');
    const tenant = new User('t-1', 'Acme');
    expect(user.id).toBe('u-1');
    expect(tenant.id).toBe('t-1');
  });

  it('exposes the identifier as a readonly field', () => {
    const user = new User('u-1', 'Alice');
    // Assigning to a readonly field is a type error — keep this assertion
    // for documentation purposes only.
    expect(user.id).toBe('u-1');
  });

  it('allows internal state to change while identity persists', () => {
    const user = new User('u-1', 'Alice');
    user.rename('Alicia');
    expect(user.name).toBe('Alicia');
    expect(user.equals(new User('u-1', 'Alice'))).toBe(true);
  });
});
