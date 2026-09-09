import { Injectable } from '@nestjs/common';
import { InvalidStateError } from '@shared/domain/invalid-state.error';
import { SubscriptionPlan } from '@modules/tenants/domain';

/**
 * Subscription policy enforcing BR-SUB-001: the FREE tier cannot use the
 * advanced inventory valuation (LIFO); switching to it requires a PAID plan.
 */
@Injectable()
export class SubscriptionPolicyService {
  /**
   * Assert that the given plan may use the requested valuation method.
   * Throws an InvalidStateError for premium-only methods on the FREE tier.
   */
  assertCanUseValuationMethod(plan: SubscriptionPlan, method: string): void {
    if (method === 'LIFO' && plan.value === 'FREE') {
      throw new InvalidStateError('LIFO inventory valuation requires a PAID subscription');
    }
  }
}
