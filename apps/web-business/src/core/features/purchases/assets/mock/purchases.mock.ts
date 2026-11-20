import type { CreatePurchaseInput, Purchase } from '../@types/purchase';

const SUPPLIERS = [
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
  'تولیدی آریا',
  'کامران اکبری',
];

const STATUSES: Purchase['status'][] = ['پرداخت‌شده', 'تسویه‌نشده', 'پرداخت جزئی'];

const DESCRIPTIONS = [
  'فروش عمده با تحویل در انبار مرکزی',
  'طبق قرارداد شماره ۱۲',
  'مشمول تخفیف مناسبتی',
  'تسویه تا پایان ماه',
  'خدمات نصب و راه‌اندازی',
  'تحویل در دو مرحله',
];

function formatFa(n: number): string {
  return n.toLocaleString('fa-IR', { maximumFractionDigits: 0 });
}

function createSeedPurchases(): Purchase[] {
  const result: Purchase[] = [];
  for (let i = 0; i < 30; i += 1) {
    const gross = 5_000_000 + (i * 23_000_000 % 700_000_000);
    const pct = [0, 0, 3, 5, 8][i % 5];
    const disc = Math.round((gross * pct) / 100);
    const total = gross - disc;
    const dayOffset = -i * 2;
    const date = new Date(Date.now() + dayOffset * 86400000).toLocaleDateString('fa-IR');
    const dueDays = (i * 7) % 46;
    const due = new Date(Date.now() + dueDays * 86400000).toLocaleDateString('fa-IR');
    result.push({
      id: `purchase-${String(i + 1).padStart(4, '0')}`,
      no: formatFa(800 + 30 - i),
      supplier: SUPPLIERS[i % SUPPLIERS.length],
      date,
      discount: disc,
      discountPercent: disc ? pct : 0,
      discountState: disc ? 'با تخفیف' : 'بدون تخفیف',
      total: total.toFixed(2),
      due,
      description: DESCRIPTIONS[i % DESCRIPTIONS.length],
      status: STATUSES[i % STATUSES.length],
      currency: 'IRR',
    });
  }
  return result;
}

const purchaseStore: Purchase[] = createSeedPurchases();

let nextPurchaseSequence = purchaseStore.length + 1;

export function getMockPurchases(): Purchase[] {
  return purchaseStore.map((purchase) => ({ ...purchase }));
}

export function insertMockPurchase(input: CreatePurchaseInput): Purchase {
  const gross = Number(input.total);
  const pct = Number(input.discountPercent);
  const disc = Math.round((gross * pct) / 100);
  const total = gross - disc;

  const purchase: Purchase = {
    id: `purchase-${String(nextPurchaseSequence++).padStart(4, '0')}`,
    no: formatFa(900 + Math.floor(Math.random() * 90)),
    supplier: input.supplier.trim(),
    date: new Date().toLocaleDateString('fa-IR'),
    discount: disc,
    discountPercent: disc ? pct : 0,
    discountState: disc ? 'با تخفیف' : 'بدون تخفیف',
    total: total.toFixed(2),
    due: input.due.trim() || new Date(Date.now() + 30 * 86400000).toLocaleDateString('fa-IR'),
    description: input.description.trim(),
    status: 'تسویه‌نشده',
    currency: 'IRR',
  };

  purchaseStore.unshift(purchase);
  return { ...purchase };
}

export function hasMockPurchaseSupplier(supplier: string): boolean {
  const normalized = supplier.trim().toLowerCase();
  return purchaseStore.some((p) => p.supplier.trim().toLowerCase() === normalized);
}
