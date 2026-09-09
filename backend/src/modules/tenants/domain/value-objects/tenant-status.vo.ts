import { ValueObject } from '@accounting-saas/ddd-core';
import { InvalidValueError } from '@shared/domain/invalid-value.error';

/**
 * Lifecycle state of a tenant (BR-USER-004). A tenant is created `ACTIVE`
 * and may transition to `DEACTIVATED`; deactivation does not delete records.
 */
export type TenantStatusValue = 'ACTIVE' | 'DEACTIVATED';

export class TenantStatus extends ValueObject {
  private constructor(public readonly value: TenantStatusValue) {
    super();
  }

  static DEFAULT: TenantStatusValue = 'ACTIVE';

  static of(candidate: string): TenantStatus {
    if (candidate !== 'ACTIVE' && candidate !== 'DEACTIVATED') {
      throw new InvalidValueError('Tenant status must be ACTIVE or DEACTIVATED');
    }
    return new TenantStatus(candidate);
  }

  static active(): TenantStatus {
    return new TenantStatus('ACTIVE');
  }

  static deactivated(): TenantStatus {
    return new TenantStatus('DEACTIVATED');
  }

  get isActive(): boolean {
    return this.value === 'ACTIVE';
  }

  toString(): string {
    return this.value;
  }
}
