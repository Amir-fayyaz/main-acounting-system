import type { PanelConfiguration } from '@repo/web/ui/panel';

export const accountingPanelConfig = {
  type: 'business-owner',
  title: 'پنل مدیریت',
  subtitle: 'حسابداری یکپارچه تراز',
  homeHref: '/panel',
  monogram: 'ت',
  navigation: [
    {
      id: 'workspace',
      label: 'میز کار',
      items: [{ label: 'میز کار', href: '/panel', icon: 'CiGrid41' }],
    },
    {
      id: 'daily',
      label: 'عملیات روزانه',
      items: [
        { label: 'خرید', href: '/panel/purchases', icon: 'CiShoppingCart' },
        { label: 'فروش', href: '/panel/sales', icon: 'CiShoppingBasket' },
        { label: 'دریافت / پرداخت', href: '/panel/payments', icon: 'CiCreditCard1' },
        { label: 'چک‌ها', href: '/panel/checks', icon: 'CiMoneyCheck1' },
        { label: 'دستگاه‌های POS', href: '/panel/pos', icon: 'CiCreditCard1' },
      ],
    },
    {
      id: 'finance',
      label: 'مالی',
      items: [
        { label: 'انبار', href: '/panel/inventory', icon: 'CiBoxes' },
        { label: 'حسابداری', href: '/panel/accounting', icon: 'CiCalculator1' },
        { label: 'دفتر روزنامه', href: '/panel/journal', icon: 'CiFileOn' },
        { label: 'تراز آزمایشی', href: '/panel/trial', icon: 'CiCalculator1' },
        { label: 'بانک و صندوق', href: '/panel/accounts', icon: 'CiBank' },
        { label: 'مغایرت‌گیری', href: '/panel/reconciliation', icon: 'CiRepeat' },
        { label: 'صندوق اسناد', href: '/panel/documents', icon: 'CiBank' },
      ],
    },
    {
      id: 'support',
      label: 'پشتیبان',
      items: [
        { label: 'اشخاص', href: '/panel/people', icon: 'CiUser' },
        { label: 'شعب', href: '/panel/branches', icon: 'CiShop' },
        { label: 'کاربران و نقش‌ها', href: '/panel/users', icon: 'CiUser' },
        { label: 'گزارش‌ها', href: '/panel/reports', icon: 'CiReceipt' },
        { label: 'تاریخچه تغییرات', href: '/panel/audit-trail', icon: 'CiFileOn' },
        { label: 'تنظیمات', href: '/panel/settings', icon: 'CiSettings' },
      ],
    },
  ],
} satisfies PanelConfiguration;
