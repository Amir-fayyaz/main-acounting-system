/**
 * The rounding rules that money and quantity arithmetic must state explicitly.
 *
 * The domain model requires every monetary value to carry a precision and a
 * rounding policy (ADR-002 section 10; domain map section 3), so nothing here
 * ever rounds implicitly: the caller names the rule it wants, and a value that
 * cannot be represented exactly is rejected rather than silently truncated.
 *
 * - `HALF_UP` — nearest, ties away from zero (the everyday money default).
 * - `HALF_EVEN` — nearest, ties to the even digit (unbiased across many sums).
 * - `DOWN` — toward zero (truncate).
 * - `UP` — away from zero.
 * - `FLOOR` — toward negative infinity.
 * - `CEILING` — toward positive infinity.
 *
 * These are arithmetic rules, not business rules: which one a domain picks for
 * a given operation stays with that domain.
 */
export enum RoundingMode {
  HALF_UP = 'HALF_UP',
  HALF_EVEN = 'HALF_EVEN',
  DOWN = 'DOWN',
  UP = 'UP',
  FLOOR = 'FLOOR',
  CEILING = 'CEILING',
}

const ROUNDING_MODES: readonly string[] = Object.values(RoundingMode);

/** Runtime guard so an unknown string cast to `RoundingMode` cannot silently truncate. */
export function isRoundingMode(value: unknown): value is RoundingMode {
  return typeof value === 'string' && (ROUNDING_MODES as readonly string[]).includes(value);
}
