import type { LucideIcon } from 'lucide-react';
import { BookOpen, Play, Wallet } from 'lucide-react';

export interface ContactPath {
  icon: LucideIcon;
  title: string;
  description: string;
  linkLabel: string;
  href: string;
}

export const contactPaths: ContactPath[] = [
  {
    icon: Wallet,
    title: 'انتخاب پلن برای شرکت',
    description: 'ظرفیت کاربران و اسناد را کنار هم مقایسه کنید.',
    linkLabel: 'دیدن تعرفه‌ها',
    href: '/pricing',
  },
  {
    icon: Play,
    title: 'آشنایی با جریان کار',
    description: 'فروش، بانک و دستیار مالی را در محیط نمونه ببینید.',
    linkLabel: 'تجربه دموی تعاملی',
    href: '/demo',
  },
  {
    icon: BookOpen,
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
