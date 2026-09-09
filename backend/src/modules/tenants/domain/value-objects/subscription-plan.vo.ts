import { ValueObject } from '@accounting-saas/ddd-core';
import { InvalidValueError } from '@shared/domain/invalid-value.error';

/**
 * Subscription tier of a tenant (BR-SUB-001). `FREE` is the default granted
 * at creation; `PAID` is reached via an upgrade.
 */
export type SubscriptionPlanValue = 'FREE' | 'PAID';

export class SubscriptionPlan extends ValueObject {
  private constructor(public readonly value: SubscriptionPlanValue) {
    super();
  }

  static DEFAULT: SubscriptionPlanValue = 'FREE';

  static of(candidate: string): SubscriptionPlan {
    if (candidate !== 'FREE' && candidate !== 'PAID') {
      throw new InvalidValueError('Subscription plan must be FREE or PAID');
    }
    return new SubscriptionPlan(candidate);
  }

  static free(): SubscriptionPlan {
    return new SubscriptionPlan('FREE');
  }

  static paid(): SubscriptionPlan {
    return new SubscriptionPlan('PAID');
  }

  toString(): string {
    return this.value;
  }
}
