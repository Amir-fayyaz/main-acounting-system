/**
 * Compares two values by structural equality. Supports primitives (including
 * bigint), Date instances, arrays, and plain/nested objects; prototype
 * members and non-enumerable fields are ignored.
 */
function deepEquals(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== typeof b) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      deepEquals((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}

/**
 * Base class for immutable value objects. Instances are defined entirely by
 * their attributes; equality is structural, not by identity. Subclasses are
 * expected to expose their fields as readonly and provide static factories.
 */
export abstract class ValueObject {
  equals(other?: ValueObject): boolean {
    return Boolean(other && deepEquals(this, other));
  }
}
