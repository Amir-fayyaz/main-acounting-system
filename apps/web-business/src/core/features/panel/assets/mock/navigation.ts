import type { PanelConfiguration } from '@repo/web/ui/panel';

export const accountingPanelConfig = {
  type: 'business-owner',
  title: 'پنل کسب‌وکار',
  subtitle: 'مدیریت کسب‌وکار و حسابداری',
  homeHref: '/',
  monogram: 'ک',
  navigation: [
    {
      id: 'general',
      label: 'عمومی',
      items: [
        { label: 'داشبورد', href: '/', icon: 'CiHome' },
        { label: 'گزارش‌ها', href: '/reports', icon: 'CiReceipt' },
      ],
    },
    {
      id: 'finance',
      label: 'مالی',
      items: [
        { label: 'دوره‌های مالی', href: '/fiscal-periods', icon: 'CiCalculator1' },
        { label: 'سال‌های مالی', href: '/fiscal-years', icon: 'CiGrid41' },
        { label: 'راه‌اندازی مالی', href: '/fiscal-setup', icon: 'CiSettings' },
      ],
    },
    {
      id: 'accounting',
      label: 'حسابداری',
      items: [
        {
          id: 'journal-entries',
          label: 'اسناد حسابداری',
          icon: 'CiRead',
          children: [
            { label: 'دفتر روزنامه', href: '/journal' },
            { label: 'ثبت سند جدید', href: '/journal/new' },
            { label: 'تراز آزمایشی', href: '/trial' },
          ],
        },
      ],
    },
    {
      id: 'treasury',
      label: 'خزانه',
      items: [
        { label: 'بانک و صندوق', href: '/accounts', icon: 'CiBank' },
        { label: 'چک‌ها', href: '/checks', icon: 'CiMoneyCheck1', badge: 5 },
        { label: 'دستگاه‌های POS', href: '/pos', icon: 'CiCreditCard1' },
      ],
    },
    {
      id: 'commerce',
      label: 'فروش و خرید',
      items: [
        {
          id: 'sales',
          label: 'فروش',
          icon: 'CiShoppingCart',
          children: [
            { label: 'فاکتورهای فروش', href: '/sales' },
            { label: 'فاکتور جدید', href: '/sales/new' },
          ],
        },
        { label: 'خرید', href: '/purchases', icon: 'CiShoppingCart' },
        { label: 'مشتریان و تأمین‌کنندگان', href: '/people', icon: 'CiUser' },
      ],
    },
    {
      id: 'organization',
      label: 'سازمان',
      items: [
        { label: 'شعب', href: '/branches', icon: 'CiShop' },
        { label: 'کاربران و نقش‌ها', href: '/users', icon: 'CiLock' },
        { label: 'لیست پرسنل', href: '/staff', icon: 'CiUser' },
        { label: 'مدیریت دسترسی', href: '/access', icon: 'CiSettings' },
        { label: 'گزارش حسابرسی', href: '/audit', icon: 'CiFileOn' },
        { label: 'تنظیمات', href: '/settings', icon: 'CiSettings' },
      ],
    },
  ],
} satisfies PanelConfiguration;
