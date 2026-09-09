import { InvalidStateError } from '@shared/domain/invalid-state.error';
import { SubscriptionPlan } from '@modules/tenants/domain';
import { SubscriptionPolicyService } from './subscription-policy.service';

describe('SubscriptionPolicyService', () => {
  const service = new SubscriptionPolicyService();

  it('allows FIFO on the FREE plan', () => {
    expect(() => service.assertCanUseValuationMethod(SubscriptionPlan.free(), 'FIFO')).not.toThrow();
  });

  it('rejects LIFO on the FREE plan', () => {
    expect(() => service.assertCanUseValuationMethod(SubscriptionPlan.free(), 'LIFO')).toThrow(
      InvalidStateError,
    );
  });

  it('allows LIFO on the PAID plan', () => {
    expect(() => service.assertCanUseValuationMethod(SubscriptionPlan.paid(), 'LIFO')).not.toThrow();
  });

  it('allows FIFO on the PAID plan', () => {
    expect(() => service.assertCanUseValuationMethod(SubscriptionPlan.paid(), 'FIFO')).not.toThrow();
  });
});
