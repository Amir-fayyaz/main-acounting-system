import type { PanelConfiguration } from '@repo/web/ui/panel';

export const businessPanelConfig = {
  type: 'business-owner',
  title: 'پنل کسب‌وکار',
  subtitle: 'مدیریت کسب‌وکار',
  homeHref: '/',
  monogram: 'ک',
  navigation: [
    {
      id: 'finance',
      label: 'امور مالی',
      items: [
        { label: 'راه‌اندازی مالی', href: '/fiscal-setup', icon: 'CiCalculator1' },
        { label: 'سال‌های مالی', href: '/fiscal-years', icon: 'CiFileOn' },
      ],
    },
    {
      id: 'management',
      label: 'مدیریت',
      items: [
        { label: 'لیست پرسنل', href: '/staff', icon: 'CiUser' },
        { label: 'مدیریت دسترسی', href: '/access', icon: 'CiSettings' },
        { label: 'گزارش حسابرسی', href: '/audit', icon: 'CiFileOn' },
      ],
    },
  ],
} satisfies PanelConfiguration;
