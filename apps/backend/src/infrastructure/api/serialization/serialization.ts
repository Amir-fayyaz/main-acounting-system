/**
 * Serialization conventions for the common infrastructure types (FND-006).
 *
 * The rules are deliberately few and generic; a business-specific rule belongs
 * to the module that owns that concept, never here.
 *
 * | Type        | Wire format                                             |
 * | ----------- | ------------------------------------------------------- |
 * | date        | `YYYY-MM-DD` (a calendar day, no time, no timezone)     |
 * | date-time   | ISO-8601 UTC instant, e.g. `2026-09-30T09:22:34.673Z`   |
 * | identifier  | UUID string                                             |
 * | money       | `{ amount: "125000.00", currency: "IRR" }` (`MoneyDto`) |
 * | enum        | the enum's string value                                 |
 * | nullable    | the key is present with `null`, never omitted           |
 *
 * Timestamps are always UTC so a client can localize them; a calendar date is a
 * timezone-free string because turning a business date into an instant would
 * invent a timezone. Returning `null` explicitly (instead of dropping a key)
 * lets a client distinguish "absent" from "not set".
 */

/** Serializes an instant as ISO-8601 in UTC — the only date-time wire format. */
export function toIsoDateTime(value: Date): string {
  return value.toISOString();
}

/** Serializes a calendar day (no time, no timezone) as `YYYY-MM-DD`. */
export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
