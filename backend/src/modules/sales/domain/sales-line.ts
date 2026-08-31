import { Money } from '../../../shared/domain/money';
import { Quantity } from '../../../shared/domain/quantity';
export interface SalesLine { readonly productId: string; readonly quantity: Quantity; readonly unitPrice: Money; }

