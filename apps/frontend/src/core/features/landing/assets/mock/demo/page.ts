import type { DemoHeroData, DemoScenarioLink } from '@/core/features/landing/assets/@types/demo';

export const demoHeroData: DemoHeroData = {
  eyebrow: 'دموی تعاملی',
  title: {
    first: 'یک دور با تراز،',
    accent: 'قبل از تصمیم.',
  },
  description:
    'نمای داشبورد را تغییر دهید، جریان یک عملیات را دنبال کنید و پیشنهاد تطبیق بانکی را بررسی کنید.',
  notice: 'همه ارقام نمونه‌اند؛ هیچ عملیات مالی واقعی اجرا نمی‌شود.',
};

export const demoScenarioLinks: readonly DemoScenarioLink[] = [
  { href: '#demo', label: 'داشبورد مالی', icon: 'grid' },
  { href: '#workflow', label: 'جریان خرید و فروش', icon: 'link' },
  { href: '#intelligence', label: 'تطبیق با تأیید شما', icon: 'spark' },
];
