import { AggregateRoot } from '../../../shared/domain/aggregate-root';
import { InvalidValueError } from '../../../shared/domain/invalid-value.error';

export type ProductType = 'PRODUCT' | 'SERVICE';
export class Product extends AggregateRoot<string> {
  private constructor(id: string, public readonly tenantId: string, private name: string, private type: ProductType, private salePrice: bigint, private purchaseCost: bigint, private active: boolean) { super(id); }
  static create(id: string, tenantId: string, name: string, type: ProductType, salePrice: bigint, purchaseCost = 0n): Product {
    if (!name.trim() || salePrice < 0n || purchaseCost < 0n) throw new InvalidValueError('Invalid product');
    return new Product(id, tenantId, name.trim(), type, salePrice, purchaseCost, true);
  }
  updatePrice(salePrice: bigint, purchaseCost = this.purchaseCost): void { if (salePrice < 0n || purchaseCost < 0n) throw new InvalidValueError('Invalid price'); this.salePrice = salePrice; this.purchaseCost = purchaseCost; }
  archive(): void { this.active = false; }
  get isService(): boolean { return this.type === 'SERVICE'; }
  get isActive(): boolean { return this.active; }
  get price(): bigint { return this.salePrice; }
  get cost(): bigint { return this.purchaseCost; }
}
