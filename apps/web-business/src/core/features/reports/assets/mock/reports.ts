import type { ReportGroup } from '../@types/reports';

export const reportGroups: readonly ReportGroup[] = [
  {
    id: 'finance',
    title: 'گزارش‌های مالی',
    description: 'รายงาน مالی و فaturas',
    icon: 'CiCalculator1',
  },
  {
    id: 'treasury',
    title: 'گزارش‌های خزانه',
    description: 'รายงาน خزانه و برداشت‌ها',
    icon: 'CiBank',
  },
  {
    id: 'sales',
    title: 'گزارش‌های فروش',
    description: 'รายงาน فروش و Customers',
    icon: 'CiShoppingCart',
  },
  {
    id: 'management',
    title: 'گزارش‌های مدیریت',
    description: 'รายงาน مدیریتی و executive',
    icon: 'CiFileOn',
  },
] as const;

export const defaultDateRange = {
  from: '',
  to: '',
};
