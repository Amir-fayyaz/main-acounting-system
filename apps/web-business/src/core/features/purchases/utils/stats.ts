import type { Purchase } from '../assets/@types/purchase';

export interface PurchaseStats {
  totalAmount: number;
  totalDiscount: number;
  discountedCount: number;
}

export function calculatePurchaseStats(purchases: readonly Purchase[]): PurchaseStats {
  return purchases.reduce<PurchaseStats>(
    (stats, purchase) => ({
      totalAmount: stats.totalAmount + Number(purchase.total),
      totalDiscount: stats.totalDiscount + purchase.discount,
      discountedCount: stats.discountedCount + (purchase.discount > 0 ? 1 : 0),
    }),
    { totalAmount: 0, totalDiscount: 0, discountedCount: 0 },
  );
}
