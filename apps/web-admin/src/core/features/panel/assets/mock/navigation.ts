import type { PanelConfiguration } from '@repo/web/ui/panel';

export const adminPanelConfig = {
  type: 'admin',
  title: 'پنل مدیریت',
  subtitle: 'مدیریت سامانه',
  homeHref: '/',
  monogram: 'ا',
  navigation: [
    {
      id: 'administration',
      label: 'مدیریت',
      items: [
        { label: 'لیست کاربران', href: '/users', icon: 'CiUser' },
        { label: 'مدیریت دسترسی', href: '/access', icon: 'CiSettings' },
        { label: 'گزارش حسابرسی', href: '/audit', icon: 'CiFileOn' },
        { label: 'لیست شرکت‌ها', href: '/companies', icon: 'CiBank' },
      ],
    },
  ],
} satisfies PanelConfiguration;
