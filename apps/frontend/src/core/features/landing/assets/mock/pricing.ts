import type {
  ComparisonColumn,
  ComparisonRow,
  Plan,
} from '@/core/features/landing/assets/@types/pricing';

const included = (): ComparisonRow['values'][number] => ({ kind: 'included', label: 'دارد' });

const text = (value: string): ComparisonRow['values'][number] => ({ kind: 'text', value });

export const plans: readonly Plan[] = [
  {
    id: 'starter',
    kind: 'priced',
    name: 'شروع',
    tag: 'تعرفه نمونه',
    description: 'برای تیم‌های کوچک',
    monthlyPrice: 790_000,
    ctaLabel: 'انتخاب پلن شروع',
    features: [
      '۲ کاربر مالی',
      '۱ شرکت و ۱ سال مالی فعال',
      '۵۰۰ سند در ماه',
      'جریان‌های اصلی مالی',
      'گزارش‌های پایه',
    ],
  },
  {
    id: 'growth',
    kind: 'priced',
    name: 'رشد',
    tag: 'پیشنهاد برای تیم‌های در حال رشد',
    description: 'برای کارهای روزانه بیشتر',
    monthlyPrice: 1_490_000,
    ctaLabel: 'انتخاب پلن رشد',
    featured: true,
    features: [
      '۵ کاربر مالی',
      '۱ شرکت و چند سال مالی',
      '۲٬۰۰۰ سند در ماه',
      'نقش‌ها و دسترسی‌های بیشتر',
      'پشتیبانی درون محصول',
    ],
  },
  {
    id: 'pro',
    kind: 'priced',
    name: 'حرفه‌ای',
    tag: 'تعرفه نمونه',
    description: 'برای تیم مالی پرتراکنش',
    monthlyPrice: 2_490_000,
    ctaLabel: 'انتخاب پلن حرفه‌ای',
    features: [
      '۱۵ کاربر مالی',
      '۱ شرکت و چند سال مالی',
      '۱۰٬۰۰۰ سند در ماه',
      'ظرفیت بیشتر بررسی اسناد',
      'همراهی در شروع کار',
    ],
  },
  {
    id: 'enterprise',
    kind: 'custom',
    name: 'سازمانی',
    tag: 'همراهی متناسب با نیاز شما',
    description: 'برای نیازهای گسترده‌تر تیم مالی',
    priceLabel: 'گفت‌وگو کنیم',
    unitLabel: 'برآورد متناسب با نیاز',
    billedLabel: 'دامنه و ظرفیت، پس از بررسی نیاز شرکت',
    ctaLabel: 'گفت‌وگو با فروش',
    features: [
      'کاربران و ظرفیت توافقی',
      'بررسی نیازهای شرکت',
      'برنامه استقرار و آموزش',
      'پشتیبانی متناسب با قرارداد',
      'هماهنگی برای توسعه همکاری',
    ],
  },
];

export const comparisonFeatureHeader = 'قابلیت / ظرفیت';

export const comparisonColumns: readonly ComparisonColumn[] = [
  { id: 'starter', label: 'شروع' },
  { id: 'growth', label: 'رشد' },
  { id: 'pro', label: 'حرفه‌ای' },
  { id: 'enterprise', label: 'سازمانی' },
];

export const comparisonRows: readonly ComparisonRow[] = [
  {
    label: 'حسابداری و دفتر کل',
    values: [included(), included(), included(), included()],
  },
  {
    label: 'خرید، فروش، انبار و خزانه',
    values: [included(), included(), included(), included()],
  },
  {
    label: 'تعداد کاربران',
    values: [text('۲'), text('۵'), text('۱۵'), text('توافقی')],
  },
  {
    label: 'سند مالی در ماه',
    values: [text('۵۰۰'), text('۲٬۰۰۰'), text('۱۰٬۰۰۰'), text('توافقی')],
  },
  {
    label: 'داشبورد و گزارش‌های پایه',
    values: [included(), included(), included(), included()],
  },
  {
    label: 'همراهی در شروع کار',
    values: [text('راهنمای شروع'), text('راهنمای شروع'), text('جلسه نمونه'), text('برنامه توافقی')],
  },
];

export const pricingNote =
  'این صفحه صرفاً پیش‌نمایش قیمت‌گذاری است؛ هیچ پرداخت یا اشتراک واقعی ایجاد نمی‌شود.';

export const pricingCta = {
  title: 'انتخاب پلن هنوز روشن نیست؟',
  description: 'کمی از حجم عملیات و تعداد همکاران مالی‌تان بگویید.',
  actionLabel: 'با ما صحبت کنید',
  href: '/contact?topic=sales',
};
