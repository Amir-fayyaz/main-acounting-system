import { Money } from '../../../shared/domain/money';
import { Quantity } from '../../../shared/domain/quantity';
export interface PurchaseLine { readonly productId: string; readonly quantity: Quantity; readonly unitCost: Money; }

