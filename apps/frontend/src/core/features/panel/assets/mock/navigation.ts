import type { PanelConfiguration } from '@repo/web/ui/panel';

export const accountingPanelConfig = {
  type: 'business-owner',
  title: 'پنل مدیریت',
  subtitle: 'حسابداری یکپارچه تراز',
  homeHref: '/panel',
  monogram: 'ت',
  navigation: [
    {
      id: 'general',
      label: 'عمومی',
      items: [
        { label: 'داشبورد', href: '/panel', icon: 'CiHome' },
        { label: 'گزارش‌ها', href: '/panel/reports', icon: 'CiReceipt' },
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
            { label: 'دفتر روزنامه', href: '/panel/journal' },
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
        { label: 'چک‌ها', href: '/panel/checks', icon: 'CiMoneyCheck1', badge: 5 },
        { label: 'دستگاه‌های POS', href: '/panel/pos', icon: 'CiCreditCard1' },
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
          children: [{ label: 'فاکتورهای فروش', href: '/panel/sales' }],
        },
        { label: 'خرید', href: '/panel/purchases', icon: 'CiShoppingCart' },
        { label: 'مشتریان و تأمین‌کنندگان', href: '/panel/people', icon: 'CiUser' },
      ],
    },
    {
      id: 'organization',
      label: 'سازمان',
      items: [
        { label: 'شعب', href: '/panel/branches', icon: 'CiShop' },
        { label: 'کاربران و نقش‌ها', href: '/panel/users', icon: 'CiLock' },
        { label: 'تاریخچه تغییرات', href: '/panel/audit-trail', icon: 'CiFileOn' },
        { label: 'تنظیمات', href: '/panel/settings', icon: 'CiSettings' },
      ],
    },
  ],
} satisfies PanelConfiguration;
