import { AggregateRoot } from '@accounting-saas/ddd-core';
import { InvalidStateError } from '@shared/domain/invalid-state.error';
import { InvalidValueError } from '@shared/domain/invalid-value.error';
import type { TenantId } from '../value-objects/tenant-id';
import type { ShopName } from '../value-objects/shop-name.vo';
import { InventoryValuationMethod } from '../value-objects/inventory-valuation-method.vo';
import { SubscriptionPlan } from '../value-objects/subscription-plan.vo';
import { TenantStatus } from '../value-objects/tenant-status.vo';
import { TenantCreatedEvent } from '../events/tenant-created.event';
import { TenantValuationMethodChangedEvent } from '../events/tenant-valuation-method-changed.event';
import { TenantDeactivatedEvent } from '../events/tenant-deactivated.event';
import { TenantAlreadyDeactivatedError } from '../errors/tenant-already-deactivated.error';

/**
 * Aggregate root for the tenant (shop) boundary, responsible for data
 * isolation (BR-TENANT-001, BR-TENANT-002). Created with a default FIFO
 * valuation (BR-REPORT-002), FREE plan (BR-SUB-001) and ACTIVE status.
 */
export class Tenant extends AggregateRoot<TenantId> {
  private constructor(
    id: TenantId,
    private readonly shopName: ShopName,
    private valuationMethod: InventoryValuationMethod,
    private subscriptionPlan: SubscriptionPlan,
    private status: TenantStatus,
  ) {
    super(id);
  }

  static create(args: { id: TenantId; shopName: ShopName; subscriptionPlan?: SubscriptionPlan }): Tenant {
    const tenant = new Tenant(
      args.id,
      args.shopName,
      InventoryValuationMethod.fifo(),
      args.subscriptionPlan ?? SubscriptionPlan.free(),
      TenantStatus.active(),
    );
    tenant.addDomainEvent(
      new TenantCreatedEvent(
        args.id,
        args.shopName.value,
        tenant.valuationMethod.value,
        tenant.subscriptionPlan.value,
      ),
    );
    return tenant;
  }

  /**
   * Rehydrate an existing tenant from persistence without re-raising creation
   * events.
   */
  static reconstitute(args: {
    id: TenantId;
    shopName: ShopName;
    valuationMethod: InventoryValuationMethod;
    subscriptionPlan: SubscriptionPlan;
    status: TenantStatus;
  }): Tenant {
    return new Tenant(args.id, args.shopName, args.valuationMethod, args.subscriptionPlan, args.status);
  }

  /** Switch inventory valuation between FIFO and LIFO (BR-REPORT-002). */
  changeValuationMethod(method: InventoryValuationMethod): void {
    this.assertActive();
    if (method.equals(this.valuationMethod)) {
      return;
    }
    const previous = this.valuationMethod.value;
    this.valuationMethod = method;
    this.addDomainEvent(new TenantValuationMethodChangedEvent(this.id, previous, method.value));
  }

  /** Deactivate the tenant (BR-USER-004). Records are never deleted. */
  deactivate(): void {
    if (this.status.value === 'DEACTIVATED') {
      throw new TenantAlreadyDeactivatedError('Tenant is already deactivated');
    }
    this.status = TenantStatus.deactivated();
    this.addDomainEvent(new TenantDeactivatedEvent(this.id));
  }

  /** Reactivate a previously deactivated tenant. */
  reactivate(): void {
    this.status = TenantStatus.active();
  }

  /** Upgrade the subscription tier from FREE to PAID (BR-SUB-001). */
  upgradePlan(plan: SubscriptionPlan): void {
    this.assertActive();
    if (plan.value === 'FREE') {
      throw new InvalidValueError('Upgrade target plan must be PAID');
    }
    this.subscriptionPlan = plan;
  }

  private assertActive(): void {
    if (this.status.value !== 'ACTIVE') {
      throw new InvalidStateError('Tenant is not active');
    }
  }

  get storeName(): ShopName {
    return this.shopName;
  }

  get valuation(): InventoryValuationMethod {
    return this.valuationMethod;
  }

  get plan(): SubscriptionPlan {
    return this.subscriptionPlan;
  }

  get tenantStatus(): TenantStatus {
    return this.status;
  }

  get isActive(): boolean {
    return this.status.isActive;
  }
}
