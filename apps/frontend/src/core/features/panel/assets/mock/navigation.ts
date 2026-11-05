import type { PanelConfiguration } from '@repo/web/ui/panel';

export const accountingPanelConfig = {
  type: 'business-owner',
  title: 'مین‌حساب',
  subtitle: 'شرکت نمونه · سال مالی ۱۴۰۵',
  homeHref: '/panel',
  monogram: 'م',
  navigation: [
    {
      id: 'general',
      label: 'عمومی',
      items: [
        { label: 'داشبورد', href: '/panel', icon: 'CiGrid41' },
        { label: 'گزارش‌ها', href: '/panel/reports', icon: 'CiReceipt' },
      ],
    },
    {
      id: 'accounting',
      label: 'حسابداری',
      items: [
        {
          id: 'accounting-documents',
          label: 'اسناد حسابداری',
          icon: 'CiCalculator1',
          defaultOpen: true,
          children: [
            { label: 'دفتر روزنامه', href: '/panel/journal' },
            { label: 'ثبت سند مرکب', href: '/panel/new-journal' },
            { label: 'تراز آزمایشی', href: '/panel/trial' },
          ],
        },
      ],
    },
    {
      id: 'treasury',
      label: 'خزانه',
      items: [
        { label: 'بانک و صندوق', href: '/panel/accounts', icon: 'CiBank' },
        { label: 'چک‌ها', href: '/panel/cheques', icon: 'CiMoneyCheck1' },
        { label: 'دستگاه‌های POS', href: '/panel/pos', icon: 'CiCreditCard1' },
      ],
    },
    {
      id: 'sales-purchases',
      label: 'فروش و خرید',
      items: [
        {
          id: 'sales',
          label: 'فروش',
          icon: 'CiShoppingCart',
          defaultOpen: true,
          children: [
            { label: 'فاکتورهای فروش', href: '/panel/invoices' },
            { label: 'فاکتور جدید', href: '/panel/new-invoice' },
          ],
        },
        { label: 'خرید', href: '/panel/purchases', icon: 'CiShoppingBasket' },
        { label: 'مشتریان و تأمین‌کنندگان', href: '/panel/people', icon: 'CiUser' },
      ],
    },
    {
      id: 'organization',
      label: 'سازمان',
      items: [
        { label: 'شعب', href: '/panel/branches', icon: 'CiShop' },
        { label: 'کاربران و نقش‌ها', href: '/panel/users', icon: 'CiUser' },
        { label: 'تاریخچه تغییرات', href: '/panel/audit', icon: 'CiFileOn' },
        { label: 'تنظیمات', href: '/panel/settings', icon: 'CiSettings' },
      ],
    },
  ],
} satisfies PanelConfiguration;
