import type { PanelConfiguration } from '@repo/web/ui/panel';

export const businessPanelConfig = {
  type: 'business-owner',
  title: 'پنل کسب‌وکار',
  subtitle: 'مدیریت کسب‌وکار',
  homeHref: '/',
  monogram: 'ک',
  navigation: [
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
