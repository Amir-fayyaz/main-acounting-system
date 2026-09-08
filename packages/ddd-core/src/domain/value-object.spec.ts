import { ValueObject } from './value-object';

class Point extends ValueObject {
  constructor(
    public readonly x: number,
    public readonly y: number,
  ) {
    super();
  }
}

class Money extends ValueObject {
  constructor(
    public readonly amount: bigint,
    public readonly currency: string,
  ) {
    super();
  }
}

class Tagged extends ValueObject {
  constructor(public readonly tag: string) {
    super();
  }
}

class Inner extends ValueObject {
  constructor(public readonly n: number) {
    super();
  }
}

class Outer extends ValueObject {
  constructor(
    public readonly inner: Inner,
    public readonly label: string,
  ) {
    super();
  }
}

describe('ValueObject', () => {
  describe('structural equality', () => {
    it('treats two instances with identical primitive fields as equal', () => {
      expect(new Point(1, 2).equals(new Point(1, 2))).toBe(true);
    });

    it('returns true regardless of memory reference', () => {
      const a = new Point(1, 2);
      const b = new Point(1, 2);
      expect(a).not.toBe(b);
      expect(a.equals(b)).toBe(true);
    });

    it('treats instances with different fields as not equal', () => {
      expect(new Point(1, 2).equals(new Point(1, 3))).toBe(false);
      expect(new Point(1, 2).equals(new Point(2, 2))).toBe(false);
    });

    it('handles bigint fields exactly', () => {
      expect(new Money(100n, 'USD').equals(new Money(100n, 'USD'))).toBe(true);
      expect(new Money(100n, 'USD').equals(new Money(101n, 'USD'))).toBe(false);
      expect(new Money(100n, 'USD').equals(new Money(100n, 'EUR'))).toBe(false);
    });
  });

  describe('null / undefined handling', () => {
    it('returns false when compared against undefined', () => {
      expect(new Point(1, 2).equals(undefined)).toBe(false);
    });

    it('returns false when called with no argument at all', () => {
      // `equals(other?)` is optional; calling without an argument must not
      // throw and must report inequality.
      const value = new Point(1, 2);
      expect(value.equals()).toBe(false);
    });

    it('returns false when compared against null', () => {
      // null is not assignable to ValueObject; cast bypasses the type to
      // verify the runtime guard.
      const value = new Point(1, 2);
      const nullAsValueObject = null as unknown as ValueObject;
      expect(value.equals(nullAsValueObject)).toBe(false);
    });
  });

  describe('Date fields', () => {
    class Timestamp extends ValueObject {
      constructor(public readonly at: Date) {
        super();
      }
    }

    it('treats two Date instances with the same instant as equal', () => {
      expect(
        new Timestamp(new Date('2026-01-01T00:00:00.000Z')).equals(
          new Timestamp(new Date('2026-01-01T00:00:00.000Z')),
        ),
      ).toBe(true);
    });

    it('treats two Date instances with different instants as not equal', () => {
      expect(
        new Timestamp(new Date('2026-01-01T00:00:00.000Z')).equals(
          new Timestamp(new Date('2026-01-02T00:00:00.000Z')),
        ),
      ).toBe(false);
    });
  });

  describe('array fields', () => {
    class TagList extends ValueObject {
      constructor(public readonly tags: readonly string[]) {
        super();
      }
    }

    it('compares arrays element-by-element, order matters', () => {
      expect(new TagList(['a', 'b']).equals(new TagList(['a', 'b']))).toBe(true);
      expect(new TagList(['a', 'b']).equals(new TagList(['b', 'a']))).toBe(false);
    });

    it('treats arrays of different lengths as not equal', () => {
      expect(new TagList(['a']).equals(new TagList(['a', 'b']))).toBe(false);
    });

    it('does not conflate arrays and objects with numeric keys', () => {
      const array = new TagList(['a']);
      const arrayLike = { 0: 'a', length: 1 } as unknown as ValueObject;
      expect(array.equals(arrayLike)).toBe(false);
    });
  });

  describe('nested object fields', () => {
    it('recurses into nested ValueObjects', () => {
      expect(new Outer(new Inner(1), 'x').equals(new Outer(new Inner(1), 'x'))).toBe(true);
    });

    it('fails when a nested ValueObject differs', () => {
      expect(new Outer(new Inner(1), 'x').equals(new Outer(new Inner(2), 'x'))).toBe(false);
    });

    it('recurses into plain nested objects inside the value', () => {
      class Holder extends ValueObject {
        constructor(public readonly nested: { a: number; b: { c: number } }) {
          super();
        }
      }
      expect(new Holder({ a: 1, b: { c: 2 } }).equals(new Holder({ a: 1, b: { c: 2 } }))).toBe(true);
      expect(new Holder({ a: 1, b: { c: 2 } }).equals(new Holder({ a: 1, b: { c: 3 } }))).toBe(false);
    });
  });

  describe('mixed types', () => {
    it('returns true for two different subclasses with identical fields', () => {
      // Equality is structural across enumerable fields and ignores the
      // concrete class identity.
      class A extends ValueObject {
        constructor(public readonly n: number) {
          super();
        }
      }
      class B extends ValueObject {
        constructor(public readonly n: number) {
          super();
        }
      }
      expect(new A(1).equals(new B(1))).toBe(true);
    });

    it('returns false when one side has an extra field', () => {
      class WithExtra extends ValueObject {
        constructor(
          public readonly n: number,
          public readonly extra?: string,
        ) {
          super();
        }
      }
      expect(new WithExtra(1).equals(new WithExtra(1, 'x'))).toBe(false);
    });
  });

  describe('composed ValueObjects', () => {
    it('compares two composed value objects deeply', () => {
      const va = new Outer(new Inner(5), 'first');
      const vb = new Outer(new Inner(5), 'first');
      expect(va.equals(vb)).toBe(true);
      expect(va.equals(new Outer(new Inner(6), 'first'))).toBe(false);
    });
  });

  describe('subclass identity', () => {
    it('preserves subclass identity in the equality chain', () => {
      const a = new Tagged('x');
      const b = new Tagged('x');
      expect(a).toBeInstanceOf(Tagged);
      expect(b).toBeInstanceOf(Tagged);
      expect(a.equals(b)).toBe(true);
    });
  });
});
