import type { Sale, SaleStatus } from '../@types/sale';

const SELLERS = ['نگار فرهادی', 'کامران اکبری', 'مهدی شریفی'] as const;
const RATES: Record<string, number> = {
  'نگار فرهادی': 2,
  'کامران اکبری': 3,
  'مهدی شریفی': 2.5,
};

const BRANCHES = ['دفتر مرکزی', 'شعبه ونک', 'شعبه اصفهان', 'شعبه تبریز'];

const NAMES = [
  'شرکت آرمان تجارت',
  'فروشگاه نوید',
  'بازرگانی پارس',
  'احمد کریمی',
  'مریم صادقی',
  'گروه صنعتی البرز',
  'داروخانه مهر',
  'رضا حیدری',
  'پخش سپهر',
  'سارا محمدی',
];

const DESCS = [
  'فروش محصولات',
  'سرویس و نگهداری',
  'پروژه عمرانی',
  'خدمات مشاوره',
  'فروش عمده',
];

const STATUSES: SaleStatus[] = ['تسویه‌شده', 'پرداخت جزئی', 'تسویه‌نشده'];

function fa(n: number): string {
  return n.toLocaleString('fa-IR', { maximumFractionDigits: 0 });
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function num(min: number, max: number, step: number, seed: number): number {
  const r = (seed * 9301 + 49297) % 233280;
  const t = r / 233280;
  const v = min + t * (max - min);
  return Math.round(v / step) * step;
}

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('fa-IR');
}

function createSeedSales(): Sale[] {
  const count = 52;
  const result: Sale[] = [];
  for (let i = 0; i < count; i++) {
    const gross = num(3e6, 9e8, 1e5, i * 7 + 1);
    const pctSeed = pick([0, 0, 5, 10, 15], i * 3);
    const disc = pctSeed ? Math.round(gross * pctSeed / 100 / 1e5) * 1e5 : 0;
    const t = gross - disc;
    const s = pick(STATUSES, i * 11);
    const sl = pick(SELLERS, i * 13);
    const rate = RATES[sl];
    const paid =
      s === 'تسویه‌شده'
        ? t
        : s === 'پرداخت جزئی'
          ? Math.round(t * 0.4 / 1e5) * 1e5
          : 0;
    const comm = Math.round(t * rate / 100 / 1e4) * 1e4;
    result.push({
      id: `sale-${String(i + 1).padStart(4, '0')}`,
      no: fa(2200 + count - i),
      cust: pick(NAMES, i * 5),
      seller: sl,
      date: day(-i),
      disc,
      pct: disc ? pctSeed : 0,
      discountState: disc ? 'با تخفیف' : 'بدون تخفیف',
      total: t.toFixed(2),
      paid: paid.toFixed(2),
      comm: comm.toFixed(2),
      rate,
      desc: pick(DESCS, i * 9),
      status: s,
      currency: 'IRR',
    });
  }
  return result;
}

const saleStore: Sale[] = createSeedSales();

let nextSaleSequence = saleStore.length + 1;

export function getMockSales(): Sale[] {
  return saleStore.map((s) => ({ ...s }));
}

export function insertMockSale(sale: Sale): Sale {
  saleStore.unshift(sale);
  return { ...sale };
}

export function hasMockSaleNo(no: string): boolean {
  return saleStore.some((s) => s.no === no);
}

export function createSaleId(): string {
  const id = `sale-${String(nextSaleSequence++).padStart(4, '0')}`;
  return id;
}

export { SELLERS, RATES, BRANCHES, NAMES };
