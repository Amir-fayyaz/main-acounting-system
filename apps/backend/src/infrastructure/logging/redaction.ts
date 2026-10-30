import type { SecretHolder } from '../config/secrets.js';

/**
 * The redaction pass every log line goes through (FND-011; 06-security-engineering).
 *
 * The redactor is the one the process already holds (`SecretRedactor`, built
 * from the values it was configured with), so a secret is scrubbed by identity,
 * not by guessing at field names. It is applied here — once, in the logging
 * layer — rather than at each call site: a call site that forgot would be the
 * one that leaked.
 *
 * The pass is deliberately conservative about *values* and about *shape*:
 *
 * - every string is redacted, at any depth, including object keys' values
 *   inside arrays (a secret nested in `detail.items[3].token` is still a
 *   secret);
 * - structures JSON cannot represent are reduced, not stringified blindly: a
 *   `Date` becomes ISO-8601, an `Error` becomes `{ name, message }`, a `BigInt`
 *   becomes a string, a function or symbol is dropped;
 * - a cyclic structure is cut with `[circular]` instead of throwing, so a log
 *   call can never fail the operation it was observing.
 */

/** How deep the pass walks before cutting a structure off. */
const MAX_DEPTH = 6;

/** What a value that cannot be represented is replaced with. */
const CIRCULAR = '[circular]';
const TOO_DEEP = '[too deep]';
const UNSUPPORTED = '[unsupported]';

/** Redacts one string. The single primitive every other rule builds on. */
export function redactText(value: string, secrets: SecretHolder): string {
  return secrets.redact(value);
}

/**
 * Reduces `value` to something JSON can represent, redacting every string in
 * it.
 *
 * Exported because the adapters and the tests assert on the same reduction; the
 * logger itself is the only production caller.
 */
export function sanitizeValue(
  value: unknown,
  secrets: SecretHolder,
  seen: WeakSet<object> = new WeakSet(),
  depth = 0,
): unknown {
  if (value === null || value === undefined) {
    return value ?? null;
  }

  if (typeof value === 'string') {
    return redactText(value, secrets);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'function' || typeof value === 'symbol') {
    return UNSUPPORTED;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? UNSUPPORTED : value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactText(value.message, secrets),
    };
  }

  if (depth >= MAX_DEPTH) {
    return TOO_DEEP;
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return CIRCULAR;
    }

    seen.add(value);

    if (Array.isArray(value)) {
      return value.map((entry) => sanitizeValue(entry, secrets, seen, depth + 1));
    }

    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry === undefined) {
        continue;
      }
      result[key] = sanitizeValue(entry, secrets, seen, depth + 1);
    }
    return result;
  }

  return UNSUPPORTED;
}
