import { AggregateRoot } from '@accounting-saas/ddd-core';
import { InvalidStateError } from '@shared/domain/invalid-state.error';
import { InvalidValueError } from '@shared/domain/invalid-value.error';
import type { TenantId } from '../value-objects/tenant-id';
import type { ShopName } from '../value-objects/shop-name.vo';
import { InventoryValuationMethod } from '../value-objects/inventory-valuation-method.vo';
import { SubscriptionPlan } from '../value-objects/subscription-plan.vo';
import type { Currency } from '../value-objects/currency.vo';
import type { TaxInfo } from '../value-objects/tax-info.vo';
import { TenantStatus, type TenantStatusValue } from '../value-objects/tenant-status.vo';
import { TenantCreatedDomainEvent } from '../events/tenant-created.event';
import { TenantStatusChangedDomainEvent } from '../events/tenant-status-changed.event';
import { TenantValuationMethodChangedEvent } from '../events/tenant-valuation-method-changed.event';
import { TenantDeactivatedEvent } from '../events/tenant-deactivated.event';
import { TenantAlreadyDeactivatedError } from '../errors/tenant-already-deactivated.error';

/**
 * Aggregate root for the tenant (shop) boundary, responsible for data
 * isolation (BR-TENANT-001, BR-TENANT-002). Acts as the legal & financial
 * identity for accounting: it encapsulates the immutable `TaxInfo` and base
 * `Currency` (issue #22) alongside inventory valuation, subscription plan and
 * the lifecycle status (ACTIVE ⇄ SUSPENDED → ARCHIVED).
 */
export class Tenant extends AggregateRoot<TenantId> {
  private constructor(
    id: TenantId,
    private readonly shopName: ShopName,
    private taxInfo: TaxInfo,
    private readonly baseCurrency: Currency,
    private valuationMethod: InventoryValuationMethod,
    private subscriptionPlan: SubscriptionPlan,
    private status: TenantStatus,
  ) {
    super(id);
  }

  static create(args: {
    id: TenantId;
    shopName: ShopName;
    taxInfo: TaxInfo;
    baseCurrency: Currency;
    subscriptionPlan?: SubscriptionPlan;
  }): Tenant {
    const tenant = new Tenant(
      args.id,
      args.shopName,
      args.taxInfo,
      args.baseCurrency,
      InventoryValuationMethod.fifo(),
      args.subscriptionPlan ?? SubscriptionPlan.free(),
      TenantStatus.active(),
    );
    tenant.addDomainEvent(
      new TenantCreatedDomainEvent(args.id, args.taxInfo.legalName, args.baseCurrency.value, new Date()),
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
    taxInfo: TaxInfo;
    baseCurrency: Currency;
    valuationMethod: InventoryValuationMethod;
    subscriptionPlan: SubscriptionPlan;
    status: TenantStatus;
  }): Tenant {
    return new Tenant(
      args.id,
      args.shopName,
      args.taxInfo,
      args.baseCurrency,
      args.valuationMethod,
      args.subscriptionPlan,
      args.status,
    );
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
    const previous = this.status.value;
    this.status = TenantStatus.deactivated();
    this.addDomainEvent(
      new TenantStatusChangedDomainEvent(this.id, previous, 'DEACTIVATED', 'Deactivated by owner request'),
    );
    this.addDomainEvent(new TenantDeactivatedEvent(this.id));
  }

  /** Temporarily suspend the tenant (e.g. for an unpaid subscription). */
  suspend(reason: string): void {
    this.assertTransitionAllowed('SUSPENDED');
    const previous = this.status.value;
    this.status = TenantStatus.suspended();
    this.addDomainEvent(new TenantStatusChangedDomainEvent(this.id, previous, 'SUSPENDED', reason));
  }

  /** Reactivate a suspended (or legacy-deactivated) tenant. */
  reactivate(): void {
    if (this.status.value !== 'SUSPENDED' && this.status.value !== 'DEACTIVATED') {
      throw new InvalidStateError(`Cannot reactivate a tenant that is ${this.status.value}`);
    }
    const previous = this.status.value;
    this.status = TenantStatus.active();
    this.addDomainEvent(new TenantStatusChangedDomainEvent(this.id, previous, 'ACTIVE', 'Reactivated'));
  }

  /** Update the legal tax identity used for official financial invoicing. */
  updateTaxInfo(taxInfo: TaxInfo): void {
    this.assertActive();
    this.taxInfo = taxInfo;
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

  private assertTransitionAllowed(_target: TenantStatusValue): void {
    if (this.status.value !== 'ACTIVE') {
      throw new InvalidStateError(`Cannot suspend a tenant that is ${this.status.value}`);
    }
  }

  get storeName(): ShopName {
    return this.shopName;
  }

  get taxIdentity(): TaxInfo {
    return this.taxInfo;
  }

  get currency(): Currency {
    return this.baseCurrency;
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
