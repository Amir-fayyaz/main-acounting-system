import { ValueObject } from '@accounting-saas/ddd-core';
import { InvalidValueError } from '@shared/domain/invalid-value.error';

/**
 * Lifecycle state of a tenant (BR-USER-004, issue #22). A tenant is created
 * `ACTIVE`, may be temporarily `SUSPENDED` and may finally be `ARCHIVED`.
 * `DEACTIVATED` is retained for the legacy deactivate flow; suspended and
 * archived tenants keep their records — nothing is ever physically deleted.
 */
export type TenantStatusValue = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' | 'DEACTIVATED';

export class TenantStatus extends ValueObject {
  private constructor(public readonly value: TenantStatusValue) {
    super();
  }

  static DEFAULT: TenantStatusValue = 'ACTIVE';

  private static readonly VALUES: readonly TenantStatusValue[] = [
    'ACTIVE',
    'SUSPENDED',
    'ARCHIVED',
    'DEACTIVATED',
  ];

  static of(candidate: string): TenantStatus {
    if (!TenantStatus.VALUES.includes(candidate as TenantStatusValue)) {
      throw new InvalidValueError('Tenant status must be ACTIVE, SUSPENDED, ARCHIVED or DEACTIVATED');
    }
    return new TenantStatus(candidate as TenantStatusValue);
  }

  static active(): TenantStatus {
    return new TenantStatus('ACTIVE');
  }

  static suspended(): TenantStatus {
    return new TenantStatus('SUSPENDED');
  }

  static archived(): TenantStatus {
    return new TenantStatus('ARCHIVED');
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
