import type { ActivityItem, DashboardSnapshot } from '../@types';
import { createId, makeMoney } from './mock-utils';

export function createMockDashboardSnapshot(): DashboardSnapshot {
  return {
    metrics: [
      {
        id: 'bank-balance',
        label: 'موجودی حساب‌های بانکی',
        value: makeMoney('48200000000.00'),
        currency: 'IRR',
        description: '۳٫۱٪ بیشتر از ماه قبل',
        trend: 'positive',
      },
      {
        id: 'cash-balance',
        label: 'موجودی صندوق‌ها',
        value: makeMoney('1340000000.00'),
        currency: 'IRR',
        description: '۳ صندوق فعال',
      },
      {
        id: 'today-receipts',
        label: 'دریافت‌های امروز',
        value: makeMoney('612000000.00'),
        currency: 'IRR',
        description: '۱۸ تراکنش',
        trend: 'positive',
      },
      {
        id: 'today-payments',
        label: 'پرداخت‌های امروز',
        value: makeMoney('287000000.00'),
        currency: 'IRR',
        description: '۹ تراکنش',
      },
      {
        id: 'today-sales',
        label: 'فروش امروز',
        value: makeMoney('740000000.00'),
        currency: 'IRR',
        description: 'ماه جاری: ۱۸٫۴ میلیارد ریال',
        trend: 'positive',
      },
      {
        id: 'today-purchases',
        label: 'خرید امروز',
        value: makeMoney('310000000.00'),
        currency: 'IRR',
        description: 'ماه جاری: ۹٫۷ میلیارد ریال',
      },
      {
        id: 'monthly-profit',
        label: 'سود خالص ماه',
        value: makeMoney('2900000000.00'),
        currency: 'IRR',
        description: '۱۵٫۸٪ حاشیه سود',
        trend: 'positive',
      },
      {
        id: 'receivables',
        label: 'مطالبات از مشتریان',
        value: makeMoney('7600000000.00'),
        currency: 'IRR',
        description: '۱۲ فاکتور سررسیدشده',
        trend: 'negative',
      },
    ],
    cashflow: [
      {
        month: 'خرداد',
        income: makeMoney('3100000000.00'),
        expense: makeMoney('2400000000.00'),
        currency: 'IRR',
      },
      {
        month: 'تیر',
        income: makeMoney('3800000000.00'),
        expense: makeMoney('2900000000.00'),
        currency: 'IRR',
      },
      {
        month: 'مرداد',
        income: makeMoney('3400000000.00'),
        expense: makeMoney('2800000000.00'),
        currency: 'IRR',
      },
      {
        month: 'شهریور',
        income: makeMoney('4600000000.00'),
        expense: makeMoney('3300000000.00'),
        currency: 'IRR',
      },
      {
        month: 'مهر',
        income: makeMoney('5200000000.00'),
        expense: makeMoney('3600000000.00'),
        currency: 'IRR',
      },
      {
        month: 'آبان',
        income: makeMoney('4900000000.00'),
        expense: makeMoney('3700000000.00'),
        currency: 'IRR',
      },
    ],
    paymentMethods: [
      { id: 'cash', label: 'نقد', percentage: 34 },
      { id: 'card', label: 'کارت', percentage: 41 },
      { id: 'cheque', label: 'چک', percentage: 18 },
      { id: 'transfer', label: 'حواله', percentage: 7 },
    ],
  };
}

export function createMockRecentActivity(): ActivityItem[] {
  return [
    {
      id: createId('activity', 1),
      title: 'ثبت فاکتور فروش',
      description: 'فاکتور ۲۲۱۸ برای شرکت آرمان تجارت',
      occurredAt: 'امروز · ۱۰:۴۲',
      status: 'success',
    },
    {
      id: createId('activity', 2),
      title: 'ثبت سند حسابداری',
      description: 'سند شماره ۱۴۰۵۰۲۴ · فروش نقدی',
      occurredAt: 'امروز · ۱۰:۱۵',
      status: 'success',
    },
    {
      id: createId('activity', 3),
      title: 'دریافت چک',
      description: 'چک دریافتی از فروشگاه نوید',
      occurredAt: 'امروز · ۰۹:۵۸',
      status: 'pending',
    },
    {
      id: createId('activity', 4),
      title: 'به‌روزرسانی اطلاعات شخص',
      description: 'اطلاعات تماس مریم صادقی',
      occurredAt: 'دیروز · ۱۶:۲۰',
      status: 'success',
    },
    {
      id: createId('activity', 5),
      title: 'تأیید پرداخت',
      description: 'پرداخت هزینه اجاره دفتر مرکزی',
      occurredAt: 'دیروز · ۱۴:۰۵',
      status: 'warning',
    },
  ];
}
