import { validateNonBlank } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * The five standard account types from double-entry bookkeeping (ACC-001.1).
 *
 * These are the only types the domain defines. Each type has a fixed normal
 * balance: assets and expenses increase with debits; liabilities, equity and
 * revenue increase with credits. The type therefore carries its normal balance
 * by construction — a child account must inherit its parent's type, and with it
 * its normal balance.
 *
 * Contra accounts (e.g., Accumulated Depreciation, which is an asset whose
 * normal balance is credit) are a special case handled at the aggregate level
 * through the `normalBalance` override on the account itself.
 */
export class AccountType {
  /** Asset — normal balance is debit. */
  public static readonly ASSET: AccountType = new AccountType('asset', 'debit');
  /** Liability — normal balance is credit. */
  public static readonly LIABILITY: AccountType = new AccountType('liability', 'credit');
  /** Equity — normal balance is credit. */
  public static readonly EQUITY: AccountType = new AccountType('equity', 'credit');
  /** Revenue — normal balance is credit. */
  public static readonly REVENUE: AccountType = new AccountType('revenue', 'credit');
  /** Expense — normal balance is debit. */
  public static readonly EXPENSE: AccountType = new AccountType('expense', 'debit');

  /** All known type strings, in a stable order. */
  public static readonly VALUES: readonly AccountType[] = [
    AccountType.ASSET,
    AccountType.LIABILITY,
    AccountType.EQUITY,
    AccountType.REVENUE,
    AccountType.EXPENSE,
  ];

  /** The lowercase string identifier. */
  public readonly value: string;

  /** The normal balance this type implies by default. */
  public readonly defaultNormalBalance: string;

  private constructor(value: string, defaultNormalBalance: string) {
    this.value = value;
    this.defaultNormalBalance = defaultNormalBalance;
  }

  /**
   * Looks up a registered type by its string identifier (case-insensitive).
   *
   * @throws InvalidPrimitiveError — the value is not a known account type.
   */
  public static from(value: string): AccountType {
    const normalized = validateNonBlank(value, 'AccountType', 'value').toLowerCase();
    const found = AccountType.VALUES.find((t) => t.value === normalized);
    if (found === undefined) {
      throw new InvalidPrimitiveError(
        'AccountType',
        `value must be one of ${AccountType.VALUES.map((t) => t.value).join(', ')} but received ${value}`,
      );
    }
    return found;
  }

  /** Whether `value` is a known account type without throwing. */
  public static isKnown(value: string): boolean {
    return typeof value === 'string' && AccountType.VALUES.some((t) => t.value === value.toLowerCase());
  }

  /** Value equality: the same type identifier. */
  public equals(other: unknown): boolean {
    return other instanceof AccountType && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as a bare string, the identifier/text wire format of FND-006. */
  public toJSON(): string {
    return this.value;
  }
}