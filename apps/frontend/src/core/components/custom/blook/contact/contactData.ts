import type { TarazIconName } from '@/core/components/custom/ui/icons/TarazIcon';

export interface ContactPath {
  icon: TarazIconName;
  title: string;
  description: string;
  linkLabel: string;
  href: string;
}

export const contactPaths: ContactPath[] = [
  {
    icon: 'wallet',
    title: 'انتخاب پلن برای شرکت',
    description: 'ظرفیت کاربران و اسناد را کنار هم مقایسه کنید.',
    linkLabel: 'دیدن تعرفه‌ها',
    href: '/pricing',
  },
  {
    icon: 'play',
    title: 'آشنایی با جریان کار',
    description: 'فروش، بانک و دستیار مالی را در محیط نمونه ببینید.',
    linkLabel: 'تجربه دموی تعاملی',
    href: '/demo',
  },
  {
    icon: 'book',
    title: 'پاسخ پرسش‌های رایج',
    description: 'درباره ثبت اسناد، تأییدها و داده‌های نمونه بخوانید.',
    linkLabel: 'پرسش‌های متداول',
    href: '/faq',
  },
];

export interface ContactTopic {
  value: string;
  label: string;
}

export const contactTopics: ContactTopic[] = [
  { value: 'product', label: 'پرسش درباره محصول' },
  { value: 'sales', label: 'فروش و انتخاب پلن' },
  { value: 'support', label: 'راهنمایی و پشتیبانی' },
  { value: 'other', label: 'سایر موضوع‌ها' },
];
