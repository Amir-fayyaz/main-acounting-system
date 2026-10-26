import { Check, FileText, Sparkles } from 'lucide-react';
import type { AboutPrinciple, AboutStep } from '@/core/features/landing/assets/@types/about';

export const aboutSteps: AboutStep[] = [
  { icon: FileText, title: 'اطلاعات و مستندات', note: 'یک‌بار ورود' },
  { icon: Sparkles, title: 'پیشنهاد آماده بررسی', note: 'همراه با دلیل' },
  { icon: Check, title: 'تأیید حسابدار', note: 'اختیار با شما' },
];

export const aboutPrinciples: AboutPrinciple[] = [
  {
    number: '۰۱',
    title: 'از نگاه حسابدار',
    description:
      'هر جریان با کار واقعی حسابدار شروع می‌شود؛ از بررسی مستندات تا کنترل نهایی ثبت‌ها.',
  },
  {
    number: '۰۲',
    title: 'یک‌بار ورود اطلاعات',
    description:
      'اطلاعات بین فروش، خرید، انبار و حسابداری جریان پیدا می‌کند؛ بدون ورود دوباره در چند بخش.',
  },
  {
    number: '۰۳',
    title: 'سرعت همراه با ثبات',
    description:
      'عملیات سریع‌تر باید با ثبات و یکپارچگی داده همراه باشد. هر عدد، یک منبع قابل پیگیری دارد.',
  },
  {
    number: '۰۴',
    title: 'عامل هوشمند، دستیار شما',
    description:
      'استخراج، تحلیل، تطبیق و آماده‌سازی با عامل؛ بررسی و اجرای عملیات حساس با تأیید کاربر.',
  },
  {
    number: '۰۵',
    title: 'سابقه‌ای که باقی می‌ماند',
    description:
      'سند مالی نهایی حذف یا مستقیم ویرایش نمی‌شود. اصلاح، یک مسیر کنترل‌شده و قابل بررسی دارد.',
  },
  {
    number: '۰۶',
    title: 'اختیار و مسیر دستی',
    description:
      'برای عملیات حساس، مسیر دستی وجود دارد تا انجام کار به پیشنهاد عامل هوشمند وابسته نباشد.',
  },
];
