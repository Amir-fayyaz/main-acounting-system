import type { Purchase } from '../assets/@types';
import { createMockPurchases } from '../assets/mock/finance';
import { paymentStatusLabel } from '../utils/status-label';
import { createMockResource } from './mock-api-utils';

export type CreatePurchaseInput = Omit<Purchase, 'id'>;

const purchasesApi = createMockResource<Purchase, CreatePurchaseInput>({
  initialData: createMockPurchases(),
  idPrefix: 'purchase',
  getSearchText: (purchase) =>
    [
      purchase.number,
      purchase.supplierName,
      purchase.status,
      purchase.issueDate,
      purchase.dueDate,
      paymentStatusLabel(purchase.status),
    ].join(' '),
  getStatus: (purchase) => purchase.status,
  createEntity: (input, id) => ({ ...input, id }),
});

export const listPurchases = purchasesApi.list;
export const createPurchase = purchasesApi.create;
