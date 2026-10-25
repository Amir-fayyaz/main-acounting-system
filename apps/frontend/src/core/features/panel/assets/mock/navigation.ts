import type { PanelConfiguration } from '../@types/panel';

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
      ],
    },
    {
      id: 'finance',
      label: 'مالی',
      items: [
        { label: 'انبار', href: '/panel/inventory', icon: 'CiBoxes' },
        { label: 'حسابداری', href: '/panel/accounting', icon: 'CiCalculator1' },
        { label: 'مغایرت‌گیری', href: '/panel/reconciliation', icon: 'CiRepeat' },
        { label: 'صندوق اسناد', href: '/panel/documents', icon: 'CiBank' },
      ],
    },
    {
      id: 'support',
      label: 'پشتیبان',
      items: [
        { label: 'اشخاص', href: '/panel/people', icon: 'CiUser' },
        { label: 'گزارش‌ها', href: '/panel/reports', icon: 'CiReceipt' },
        { label: 'Audit Trail', href: '/panel/audit-trail', icon: 'CiFileOn' },
        { label: 'تنظیمات', href: '/panel/settings', icon: 'CiSettings' },
      ],
    },
  ],
} satisfies PanelConfiguration;
