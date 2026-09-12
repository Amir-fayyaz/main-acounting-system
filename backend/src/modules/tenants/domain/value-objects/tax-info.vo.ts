import { ValueObject } from '@accounting-saas/ddd-core';
import { InvalidValueError } from '@shared/domain/invalid-value.error';

/**
 * Legal tax identity of a tenant, required for official financial invoicing.
 * `legalName` is the registered company name and `nationalId` is the tax
 * registration number. Both are immutable once validated.
 */
export class TaxInfo extends ValueObject {
  private constructor(
    public readonly legalName: string,
    public readonly nationalId: string,
  ) {
    super();
  }

  static of(candidate: { legalName: string; nationalId: string }): TaxInfo {
    const legalName = candidate.legalName?.trim() ?? '';
    const nationalId = candidate.nationalId?.trim() ?? '';
    if (legalName.length === 0) {
      throw new InvalidValueError('Tax info legal name must not be empty');
    }
    if (legalName.length > 100) {
      throw new InvalidValueError('Tax info legal name must not exceed 100 characters');
    }
    if (!/^\d{10}$/.test(nationalId)) {
      throw new InvalidValueError('Tax info national ID must be a 10-digit number');
    }
    return new TaxInfo(legalName, nationalId);
  }

  toString(): string {
    return `${this.legalName} (${this.nationalId})`;
  }
}
