import { describeValue } from '../../../../shared/primitives/assert.js';

/**
 * The sanitizer every audit record's context passes through before it is stored
 * (AUD-001; ADR-010 section 6; ADR-015 section 12).
 *
 * An audit record is durable, widely readable security data — the one record an
 * operator, an incident review and a future UI all read — so it must never
 * become a second credential store. The rule is enforced where the record is
 * built, not where it is read:
 *
 * ```text
 * metadata in  →  sanitize  →  metadata stored
 *                  │
 *                  ├─ a sensitive key   → the value is replaced by [redacted]
 *                  ├─ a nested value    → sanitized recursively, up to a depth bound
 *                  └─ a non-data value  → dropped (never serialized)
 * ```
 *
 * Three decisions are worth stating:
 *
 * - **A sensitive key keeps its place, not its value.** Redacting rather than
 *   dropping the key records *that context existed* while storing none of it,
 *   so a reader cannot mistake "there was no token here" for "a token was
 *   removed" — and no test can pass by accident because a key went missing.
 * - **Only data survives.** Strings, finite numbers, booleans, null, arrays,
 *   `Date` (as an ISO-8601 instant) and plain objects. A function, a symbol, a
 *   `bigint`, a class instance without a plain shape is dropped rather than
 *   coerced, because a value that has no JSON form is a value the record cannot
 *   honestly claim to have captured.
 * - **Depth is bounded.** A context deeper than {@link AUDIT_METADATA_MAX_DEPTH}
 *   is replaced by {@link AUDIT_TRUNCATION_MARKER}. Audit metadata is context,
 *   not a payload dump: an unbounded structure would let one caller write an
 *   arbitrarily large row into a table every operator reads.
 *
 * The result is deeply frozen, so nothing downstream can edit a stored fact on
 * its way out of the domain.
 */

/** Replaces the value of a key that names credential material. */
export const AUDIT_REDACTION_MARKER = '[redacted]';

/** Replaces context nested deeper than the bound. */
export const AUDIT_TRUNCATION_MARKER = '[truncated]';

/** How deep the sanitizer descends before it truncates. */
export const AUDIT_METADATA_MAX_DEPTH = 4;

/**
 * The keys whose *value* is credential material or a bearer secret.
 *
 * Matching is on the normalized key (lower-cased, separators collapsed), so
 * `password`, `passwordHash`, `access_token`, `apiKey` and `api-key` are all
 * recognised. The list is deliberately broad and errs towards redaction: a
 * mis-redacted harmless value costs a reader one `[redacted]`, while a missed
 * secret costs the system a credential.
 */
const SENSITIVE_KEY_PATTERN =
  /(pass(word|wd|phrase)?|secret|token|credential|passhash|passwordhash|hash|salt|apikey|privatekey|accesskey|secretkey|authorization|authheader|cookie|signature|bearer|sessionkey|sessionsecret|dsn|connectionstring)/;

/** What a sanitized context is made of. */
export type AuditMetadataValue =
  | string
  | number
  | boolean
  | null
  | readonly AuditMetadataValue[]
  | { readonly [key: string]: AuditMetadataValue };

/** A sanitized, deeply frozen context object. */
export type AuditMetadata = { readonly [key: string]: AuditMetadataValue };

/** Normalizes a key so `passwordHash`, `password_hash` and `PASSWORD-HASH` agree. */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Whether a key names credential material whose value must never be stored. */
export function isSensitiveAuditKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(normalizeKey(key));
}

/** Whether `value` is a plain object (a record), not a class instance or an array. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

/** Sanitizes one value, answering `undefined` when it must not be stored. */
function sanitizeValue(value: unknown, depth: number): AuditMetadataValue | undefined {
  if (value === null) return null;

  switch (typeof value) {
    case 'string':
    case 'boolean':
      return value;
    case 'number':
      // `NaN` and the infinities have no JSON form; storing them would make the
      // record unreadable rather than merely imprecise.
      return Number.isFinite(value) ? value : undefined;
    case 'undefined':
    case 'function':
    case 'symbol':
    case 'bigint':
      return undefined;
    default:
      break;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item, depth + 1))
      .filter((item): item is AuditMetadataValue => item !== undefined);
  }

  if (isPlainObject(value)) {
    // `depth` counts the containers already descended, so the bound is stated
    // once and applies to objects nested in arrays exactly as it does to objects
    // nested in objects.
    if (depth >= AUDIT_METADATA_MAX_DEPTH) {
      return AUDIT_TRUNCATION_MARKER;
    }

    return sanitizeObject(value, depth + 1);
  }

  // A class instance, a Map, a Set, a stream: a value the record cannot
  // honestly capture as data, so it is left out instead of coerced.
  return undefined;
}

/** Sanitizes a record's own enumerable entries. */
function sanitizeObject(source: Record<string, unknown>, depth: number): AuditMetadata {
  const sanitized: Record<string, AuditMetadataValue> = {};

  for (const [key, value] of Object.entries(source)) {
    if (isSensitiveAuditKey(key)) {
      sanitized[key] = AUDIT_REDACTION_MARKER;
      continue;
    }

    const cleaned = sanitizeValue(value, depth);
    if (cleaned !== undefined) {
      sanitized[key] = cleaned;
    }
  }

  return Object.freeze(sanitized);
}

/**
 * Sanitizes an arbitrary context object for persistence.
 *
 * Returns a deeply frozen, JSON-safe object; a non-object input (or an input
 * that sanitizes to nothing) yields an empty context rather than an error,
 * because "this fact carries no extra context" is a normal, honest answer.
 */
export function sanitizeAuditMetadata(value: unknown): AuditMetadata {
  if (!isPlainObject(value) || Object.keys(value).length === 0) {
    return Object.freeze({});
  }

  return sanitizeObject(value, 1);
}

/**
 * Describes a rejected context value for an error message without echoing it —
 * a value that reached the sanitizer may well be the secret itself.
 */
export function describeContext(value: unknown): string {
  return isPlainObject(value) ? 'an object' : describeValue(value);
}
