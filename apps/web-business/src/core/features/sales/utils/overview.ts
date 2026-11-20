import type { Sale } from '../assets/@types/sale';
import { RATES, SELLERS } from '../assets/mock/sales.mock';

export interface SellerStat {
  seller: string;
  count: number;
  total: number;
  comm: number;
  rate: number;
}

export interface SalesOverview {
  totalSales: number;
  totalDiscount: number;
  discountCount: number;
  outstanding: number;
  totalCommission: number;
  sellerStats: SellerStat[];
}

function sum(sales: readonly Sale[], pick: (sale: Sale) => number): number {
  return sales.reduce((total, sale) => total + pick(sale), 0);
}

export function calculateSalesOverview(sales: readonly Sale[]): SalesOverview {
  const sellerStats = SELLERS.map((seller) => {
    const rows = sales.filter((sale) => sale.seller === seller);

    return {
      seller,
      count: rows.length,
      total: sum(rows, (sale) => Number(sale.total)),
      comm: sum(rows, (sale) => Number(sale.comm)),
      rate: RATES[seller] ?? 0,
    };
  });

  return {
    totalSales: sum(sales, (sale) => Number(sale.total)),
    totalDiscount: sum(sales, (sale) => Number(sale.disc)),
    discountCount: sales.filter((sale) => Number(sale.disc) > 0).length,
    outstanding: sum(sales, (sale) => Number(sale.total) - Number(sale.paid)),
    totalCommission: sum(sales, (sale) => Number(sale.comm)),
    sellerStats,
  };
}
