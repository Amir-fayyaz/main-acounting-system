import { Entity } from '../../../shared/domain/entity';
import { InvalidValueError } from '../../../shared/domain/invalid-value.error';

export type MovementType = 'PURCHASE' | 'SALE' | 'RETURN' | 'ADJUSTMENT';
export class InventoryMovement extends Entity<string> {
  private constructor(id: string, public readonly tenantId: string, public readonly productId: string, public readonly type: MovementType, public readonly quantity: number, public readonly unitCost: bigint, public readonly reason?: string) { super(id); }
  static record(id: string, tenantId: string, productId: string, type: MovementType, quantity: number, unitCost: bigint, reason?: string): InventoryMovement {
    if (!Number.isFinite(quantity) || quantity === 0 || unitCost < 0n || (type === 'ADJUSTMENT' && !reason?.trim())) throw new InvalidValueError('Invalid inventory movement');
    return new InventoryMovement(id, tenantId, productId, type, quantity, unitCost, reason?.trim());
  }
}
