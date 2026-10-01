import {
  describeValue,
  validateIntegerInRange,
  validateMatches,
  validateNonBlank,
} from '../primitives/assert.js';
import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';

/**
 * A currency: three-letter ISO 4217 code plus the number of fractional digits
 * its amounts are stored with (ADR-002 section 10; architecture constraints
 * section 13).
 *
 * The abstraction exists so adding a currency is *data*, not a rewrite: the MVP
 * activates `IRR` only, and a later `USD` or `EUR` is a `register` call that
 * every existing `Money` computation understands without change. What a
 * currency is *called* on screen, how it is formatted and which one a company
 * transacts in are all outside this type — it deliberately has no symbol, no
 * locale and no display rule, so nothing here can drift into UI or module
 * concerns.
 *
 * The registry is module-level state rather than a database lookup so a value
 * object stays framework-independent and usable before any infrastructure is
 * up; ISO 4217 is a fixed, published table, not tenant data.
 */
export interface CurrencySpec {
  /** ISO 4217 alphabetic code, e.g. `IRR`. */
  readonly code: string;
  /** Fractional digits used when storing amounts, `0..4` per ISO 4217. */
  readonly minorUnit: number;
}

const ISO_4217_PATTERN = /^[A-Z]{3}$/;

/** Highest minor unit defined by ISO 4217 (e.g. the 4 of `CLF`). */
const MAX_MINOR_UNIT = 4;

const registry = new Map<string, Currency>();

export class Currency {
  /**
   * Iranian Rial — the only currency the MVP activates (architecture
   * constraints section 13). Its minor unit is 0 as defined by ISO 4217, so a
   * stored amount is a whole number of rials; the value lives in the registry,
   * so changing the stored precision of a currency is a one-line data change.
   */
  public static readonly IRR: Currency = Currency.register({ code: 'IRR', minorUnit: 0 });

  /**
   * Publishes a currency for the whole application.
   *
   * This is the extension point that keeps the kernel independent of any single
   * currency: registering a code once makes it constructible everywhere, and
   * registering it twice is an error rather than a silent overwrite.
   */
  public static register(spec: CurrencySpec): Currency {
    if (spec === null || typeof spec !== 'object') {
      throw new InvalidPrimitiveError(
        'Currency',
        `spec must be an object but received ${describeValue(spec)}`,
      );
    }
    const code = validateMatches(
      validateNonBlank(spec.code, 'Currency', 'code').toUpperCase(),
      ISO_4217_PATTERN,
      'Currency',
      'code',
      'a three-letter ISO 4217 code',
    );
    const minorUnit = validateIntegerInRange(
      spec.minorUnit,
      0,
      MAX_MINOR_UNIT,
      'Currency',
      'minorUnit',
    );
    if (registry.has(code)) {
      throw new InvalidPrimitiveError('Currency', `code ${code} is already registered`);
    }
    const currency = new Currency(code, minorUnit);
    registry.set(code, currency);
    return currency;
  }

  /**
   * Looks up a registered currency by code; case and surrounding whitespace are
   * forgiven because a code arriving from JSON or a header is not guaranteed to
   * be in canonical case. An unregistered code is rejected rather than silently
   * defaulting, so a typo cannot quietly produce a wrong-currency amount.
   */
  public static of(code: string): Currency {
    const normalized = validateNonBlank(code, 'Currency', 'code').toUpperCase();
    const currency = registry.get(normalized);
    if (currency === undefined) {
      throw new InvalidPrimitiveError('Currency', `code ${normalized} is not registered`);
    }
    return currency;
  }

  /** Whether `code` has been registered, without throwing. */
  public static isRegistered(code: string): boolean {
    return typeof code === 'string' && registry.has(code.trim().toUpperCase());
  }

  /** ISO 4217 code. */
  public readonly code: string;

  /** Fractional digits this currency stores amounts with. */
  public readonly minorUnit: number;

  private constructor(code: string, minorUnit: number) {
    this.code = code;
    this.minorUnit = minorUnit;
  }

  /** Value equality by code; the registry guarantees one instance per code. */
  public equals(other: Currency): boolean {
    return other instanceof Currency && this.code === other.code;
  }

  public toString(): string {
    return this.code;
  }

  /** Serializes as the bare ISO 4217 code, matching the API's `currency` field. */
  public toJSON(): string {
    return this.code;
  }
}
