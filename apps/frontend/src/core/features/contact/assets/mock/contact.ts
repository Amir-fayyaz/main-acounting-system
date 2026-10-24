import { BookOpen, Play, Wallet } from 'lucide-react';
import type { ContactFieldValues, ContactPath, ContactTopic } from '../@types/contact';

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

export const contactTopics: ContactTopic[] = [
  { value: 'product', label: 'پرسش درباره محصول' },
  { value: 'sales', label: 'فروش و انتخاب پلن' },
  { value: 'support', label: 'راهنمایی و پشتیبانی' },
  { value: 'other', label: 'سایر موضوع‌ها' },
];

export const emptyContactValues: ContactFieldValues = {
  name: '',
  email: '',
  phone: '',
  message: '',
};
