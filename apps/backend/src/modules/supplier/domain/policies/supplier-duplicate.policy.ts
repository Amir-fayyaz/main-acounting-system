import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { describeValue, validateNonBlank } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import {
  SupplierCodeDuplicateError,
  SupplierIdentificationDuplicateError,
} from '../errors/supplier.errors.js';
import type { SupplierCode } from '../value-objects/supplier-code.js';
import type { SupplierIdentificationNumber } from '../value-objects/supplier-identification-number.js';
import type { SupplierName } from '../value-objects/supplier-name.js';
import type { SupplierId } from '../value-objects/supplier-id.js';

/**
 * The one place that decides whether a new supplier duplicates an existing one
 * (PUR-001).
 *
 * The rule is scoped by tenant and has three outcomes, in this order:
 *
 * | Matches an existing supplier of the same tenant by | Outcome |
 * | -------------------------------------------------- | ------- |
 * | code (case-insensitive)                            | conflict |
 * | identification number (when both are present)      | conflict |
 * | normalized name                                    | possible duplicate |
 * | nothing                                            | clear |
 *
 * A hard conflict wins over a possible duplicate, because no confirmation can
 * make a repeated code or identification number acceptable. A name match is
 * only *possible*: two suppliers may legitimately share a name, so the caller
 * must present the matches and ask for explicit confirmation before creating.
 *
 * Normalization is injected as a function. This keeps the policy independent of
 * the Persian text normalizer that S2 owns, and it makes the rule deterministic
 * in a unit test: the same policy evaluated with a stub normalizer behaves
 * exactly like the production one because the strategy is an input, not a
 * hidden import.
 */

/** Normalizes a supplier name for duplicate comparison. */
export type SupplierNameNormalizer = (name: string) => string;

/** The structural facts an existing supplier exposes to the duplicate rule. */
export interface SupplierDuplicateRecord {
  readonly id: SupplierId;
  readonly tenantId: string;
  readonly code: SupplierCode;
  readonly name: SupplierName;
  readonly normalizedName: string;
  readonly identificationNumber?: SupplierIdentificationNumber;
}

/** The facts about the supplier that is about to be created. */
export interface SupplierDuplicateCandidate {
  readonly tenantId: string;
  readonly code: SupplierCode;
  readonly name: SupplierName;
  readonly identificationNumber?: SupplierIdentificationNumber;
}

/** What the rule decided, together with the normalized name it computed. */
export type SupplierDuplicateDecision =
  | { readonly kind: 'clear' }
  | { readonly kind: 'conflict'; readonly error: DomainError }
  | {
      readonly kind: 'possibleDuplicate';
      readonly matches: readonly SupplierDuplicateRecord[];
    };

/** A decision plus the normalized name the aggregate will store. */
export interface SupplierDuplicateAssessment {
  readonly normalizedName: string;
  readonly decision: SupplierDuplicateDecision;
}

export class SupplierDuplicatePolicy {
  public constructor(private readonly normalize: SupplierNameNormalizer) {
    if (typeof normalize !== 'function') {
      throw new InvalidPrimitiveError(
        'SupplierDuplicatePolicy',
        `normalize must be a function but received ${describeValue(normalize)}`,
      );
    }
  }

  /** The canonical name this policy compares and the aggregate stores. */
  public normalizeName(name: SupplierName): string {
    const normalized = this.normalize(name.value);
    return validateNonBlank(normalized, 'SupplierDuplicatePolicy', 'normalizedName');
  }

  /**
   * Evaluates the candidate against all existing suppliers it was given.
   *
   * The caller passes the tenant's suppliers; the policy filters by tenant again
   * so the rule is total even when a broader collection is handed in. Different
   * tenants may share every field.
   */
  public evaluate(
    candidate: SupplierDuplicateCandidate,
    existingSuppliers: readonly SupplierDuplicateRecord[],
  ): SupplierDuplicateAssessment {
    if (!Array.isArray(existingSuppliers)) {
      throw new InvalidPrimitiveError(
        'SupplierDuplicatePolicy',
        `existingSuppliers must be an array but received ${describeValue(existingSuppliers)}`,
      );
    }

    const normalizedName = this.normalizeName(candidate.name);
    const sameTenant = existingSuppliers.filter(
      (supplier) => supplier.tenantId === candidate.tenantId,
    );

    for (const supplier of sameTenant) {
      if (supplier.code.equals(candidate.code)) {
        return {
          normalizedName,
          decision: {
            kind: 'conflict',
            error: new SupplierCodeDuplicateError(candidate.code.value),
          },
        };
      }
    }

    if (candidate.identificationNumber !== undefined) {
      for (const supplier of sameTenant) {
        if (supplier.identificationNumber?.equals(candidate.identificationNumber) === true) {
          return {
            normalizedName,
            decision: {
              kind: 'conflict',
              error: new SupplierIdentificationDuplicateError(candidate.identificationNumber.value),
            },
          };
        }
      }
    }

    const matches = sameTenant.filter((supplier) => supplier.normalizedName === normalizedName);
    if (matches.length > 0) {
      return {
        normalizedName,
        decision: { kind: 'possibleDuplicate', matches },
      };
    }

    return { normalizedName, decision: { kind: 'clear' } };
  }
}
