import type { ReportDefinition } from '../@types';
import { createId } from './mock-utils';

const reports: Omit<ReportDefinition, 'id'>[] = [
  { title: 'ترازنامه', group: 'financial', description: 'نمای کلی دارایی‌ها، بدهی‌ها و سرمایه' },
  { title: 'صورت سود و زیان', group: 'financial', description: 'خلاصه درآمدها و هزینه‌های دوره' },
  { title: 'صورت جریان وجوه نقد', group: 'financial', description: 'ورودی‌ها و خروجی‌های نقدی' },
  { title: 'تراز آزمایشی', group: 'financial', description: 'مانده بدهکار و بستانکار حساب‌ها' },
  { title: 'دفتر کل', group: 'financial', description: 'گردش حساب‌ها در دفتر کل' },
  { title: 'گردش حساب بانکی', group: 'treasury', description: 'تراکنش‌های حساب‌های بانکی' },
  {
    title: 'گزارش سررسید چک‌ها',
    group: 'treasury',
    description: 'چک‌های نزدیک سررسید و سررسیدشده',
  },
  {
    title: 'مغایرت بانکی',
    group: 'treasury',
    description: 'موارد نیازمند تطبیق با صورت‌حساب بانک',
  },
  { title: 'فروش روزانه', group: 'sales-purchases', description: 'خلاصه فاکتورهای فروش روزانه' },
  { title: 'فاکتورهای تسویه‌نشده', group: 'sales-purchases', description: 'مانده فاکتورهای باز' },
  { title: 'عملکرد شعب', group: 'management', description: 'مقایسه عملکرد مالی شعب' },
  { title: 'عملکرد کاربران', group: 'management', description: 'خلاصه فعالیت کاربران سامانه' },
];

export function createMockReports(): ReportDefinition[] {
  return reports.map((report, index) => ({ ...report, id: createId('report', index + 1) }));
}
