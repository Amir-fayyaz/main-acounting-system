import type { ReportGroup } from '../@types/reports';

export const reportGroups: readonly ReportGroup[] = [
  {
    id: 'finance',
    title: 'گزارشات مالی',
    items: [
      { id: 'balance-sheet', label: 'ترازنامه' },
      { id: 'income-statement', label: 'صورت سود و زیان' },
      { id: 'cash-flow', label: 'صورت جریان وجوه نقد' },
      { id: 'trial-balance', label: 'تراز آزمایشی' },
      { id: 'general-ledger', label: 'دفتر کل' },
      { id: 'sub-ledger', label: 'دفتر معین' },
      { id: 'account-turnover', label: 'گردش حساب' },
      { id: 'debtors-creditors', label: 'گزارش بدهکاران و بستانکاران' },
    ],
  },
  {
    id: 'treasury',
    title: 'خزانه‌داری',
    items: [
      { id: 'bank-balances', label: 'موجودی بانک‌ها' },
      { id: 'bank-turnover', label: 'گردش حساب بانکی' },
      { id: 'cheque-due', label: 'گزارش سررسید چک‌ها' },
      { id: 'bank-reconciliation', label: 'مغایرت بانکی' },
      { id: 'cash-flow', label: 'جریان نقدینگی' },
    ],
  },
  {
    id: 'sales',
    title: 'فروش و خرید',
    items: [
      { id: 'daily-sales', label: 'فروش روزانه' },
      { id: 'sales-by-customer', label: 'فروش بر اساس مشتری' },
      { id: 'sales-by-branch', label: 'فروش شعب' },
      { id: 'purchases-by-supplier', label: 'خرید بر اساس تأمین‌کننده' },
      { id: 'unsettled-invoices', label: 'فاکتورهای تسویه‌نشده' },
      { id: 'tax-report', label: 'گزارش مالیات' },
    ],
  },
  {
    id: 'management',
    title: 'مدیریتی',
    items: [
      { id: 'branch-performance', label: 'عملکرد شعب' },
      { id: 'user-performance', label: 'عملکرد کاربران' },
      { id: 'branch-profitability', label: 'سودآوری هر شعبه' },
      { id: 'budget-report', label: 'گزارش بودجه' },
      { id: 'cash-flow-forecast', label: 'پیش‌بینی جریان نقدینگی' },
    ],
  },
] as const;

export const branches = ['همه شعب', 'دفتر مرکزی', 'شعبه ونک', 'شعبه اصفهان', 'شعبه تبریز'] as const;

export const statuses = ['همه', 'تراز', 'پیش‌نویس'] as const;
