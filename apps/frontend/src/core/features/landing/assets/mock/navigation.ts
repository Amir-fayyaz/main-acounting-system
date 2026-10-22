import type {
  FooterColumn,
  NavigationLink,
  ProductMenuItem,
} from '@/core/features/landing/assets/@types/navigation';

export const navigationLinks: NavigationLink[] = [
  { href: '/', label: 'خانه' },
  { href: '/pricing', label: 'تعرفه‌ها' },
  { href: '/about', label: 'درباره ما' },
  { href: '/faq', label: 'پرسش‌ها' },
  { href: '/contact', label: 'تماس با ما' },
];

export const productMenuItems: ProductMenuItem[] = [
  {
    href: '/#features',
    label: 'امکانات تراز',
    description: 'فروش، انبار، بانک و حسابداری',
    icon: 'grid',
  },
  {
    href: '/demo',
    label: 'دموی تعاملی',
    description: 'یک دور با داده‌های نمونه',
    icon: 'play',
  },
  {
    href: '/#intelligence',
    label: 'دستیار هوشمند',
    description: 'پیشنهاد با تراز، تأیید با شما',
    icon: 'spark',
  },
];

export const footerTopline = {
  title: 'حساب‌های روشن‌تر.',
  titleAccent: 'تصمیم‌های مطمئن‌تر.',
  linkLabel: 'یک نگاه به محیط تراز',
  href: '/demo',
};

export const footerIdentity = {
  description:
    'حسابداری برای آدم‌هایی که پشت عددها هستند. یک فضای مشترک برای تمام جریان‌های مالی کسب‌وکار شما.',
  origin: 'با دقت برای کسب‌وکارهای ایرانی',
};

export const footerColumns: FooterColumn[] = [
  {
    title: 'محصول',
    ariaLabel: 'پیوندهای محصول',
    links: [
      { href: '/', label: 'صفحه اصلی' },
      { href: '/#features', label: 'امکانات تراز' },
      { href: '/pricing', label: 'تعرفه‌ها و پلن‌ها' },
      { href: '/demo', label: 'دموی تعاملی' },
      { href: '/auth', label: 'ورود و ساخت حساب' },
    ],
  },
  {
    title: 'بیشتر درباره تراز',
    ariaLabel: 'درباره تراز',
    links: [
      { href: '/about', label: 'درباره ما' },
      { href: '/contact', label: 'تماس با ما' },
      { href: '/faq', label: 'پرسش‌های متداول' },
      { href: '/terms', label: 'شرایط استفاده' },
    ],
  },
  {
    title: 'کار روزانه شما',
    ariaLabel: 'جریان‌های مالی',
    links: [
      { href: '/#features', label: 'فروش و انبار' },
      { href: '/demo#workflow', label: 'خرید و پرداختنی‌ها' },
      { href: '/demo#intelligence', label: 'بانک و تطبیق' },
      { href: '/#scope', label: 'حسابداری و دفتر کل' },
    ],
  },
];

export const footerCaption = {
  strong: 'هوش در خدمت حسابدار.',
  text: 'پیشنهاد، استخراج و تطبیق با تراز؛ بررسی و تأیید نهایی با شما. عملیات حساس همیشه مسیر دستی دارند.',
  linkLabel: 'نمونه تطبیق را ببینید',
  href: '/demo#intelligence',
};

export const footerSignature = 'از عددها، به اطمینان.';

export const footerMeta = [
  'تراز · حسابداری یکپارچه با اختیار شما',
  'پیش‌نمایش محصول · داده‌های نمونه',
];
