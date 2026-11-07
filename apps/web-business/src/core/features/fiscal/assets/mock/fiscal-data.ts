export type FiscalYear = {
  id: string;
  title: string;
  from: string;
  to: string;
  periods: number;
  openPeriods: number;
  status: 'فعال' | 'آینده' | 'بسته';
};

export const initialFiscalYears: FiscalYear[] = [
  {
    id: '1405',
    title: 'سال مالی ۱۴۰۵',
    from: '۱۴۰۵/۰۱/۰۱',
    to: '۱۴۰۵/۱۲/۲۹',
    periods: 12,
    openPeriods: 9,
    status: 'فعال',
  },
  {
    id: '1404',
    title: 'سال مالی ۱۴۰۴',
    from: '۱۴۰۴/۰۱/۰۱',
    to: '۱۴۰۴/۱۲/۳۰',
    periods: 12,
    openPeriods: 0,
    status: 'بسته',
  },
  {
    id: '1406',
    title: 'سال مالی ۱۴۰۶',
    from: '۱۴۰۶/۰۱/۰۱',
    to: '۱۴۰۶/۱۲/۲۹',
    periods: 12,
    openPeriods: 12,
    status: 'آینده',
  },
];

export const setupSteps = ['تعریف سال مالی', 'ایجاد دوره‌ها', 'باز کردن دوره‌ها', 'مرور و اتمام'];

export const months = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];
