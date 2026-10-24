import type {
  DashboardData,
  DashboardReport,
  DashboardReportLink,
  DashboardView,
} from '@/core/features/landing/assets/@types/dashboard';
import type { LandingIconName } from '@/core/features/landing/components/ui/icon/LandingIcon';

export const dashboardReports: Record<DashboardView, DashboardReport> = {
  overview: {
    name: 'نمای کلی کسب‌وکار',
    title: 'روز خوبی برای حساب‌های مرتب.',
    subtitle: 'یک نگاه به وضعیت مالی آتیه‌سازان · ارقام به تومان',
    labels: ['فروش خالص', 'مانده دریافتنی‌ها', 'موجودی نقد و بانک'],
    month: ['۸۴۲٬۵۰۰٬۰۰۰', '۱۲۶٬۲۰۰٬۰۰۰', '۳۶۴٬۸۰۰٬۰۰۰'],
    year: ['۵٬۱۶۸٬۰۰۰٬۰۰۰', '۱۲۶٬۲۰۰٬۰۰۰', '۳۶۴٬۸۰۰٬۰۰۰'],
    feet: ['↗ ۱۲٫۸٪ نسبت به ماه قبل', '۱۸ فاکتور در انتظار دریافت', 'مجموع ۳ حساب متصل به دفتر کل'],
    yearFeet: [
      '↗ ۹٫۴٪ نسبت به سال قبل',
      'مانده دریافتنی در پایان دوره',
      'مانده حساب‌ها در پایان دوره',
    ],
    chart: 'جریان دریافت و پرداخت',
    legend: ['دریافت', 'پرداخت'],
    bars: [44, 31, 58, 38, 51, 42, 76, 48, 67, 44, 91, 59],
    insight: '۳ واریزی با فاکتورهای باز مطابقت دارند. پیشنهادها آماده بررسی‌اند.',
  },
  sales: {
    name: 'فروش و دریافت‌ها',
    title: 'فروش‌ها روشن، دریافت‌ها قابل پیگیری.',
    subtitle: 'وضعیت فروش و تسویه فاکتورها · ارقام به تومان',
    labels: ['فروش خالص', 'مبلغ وصول‌شده', 'مانده دریافتنی‌ها'],
    month: ['۸۴۲٬۵۰۰٬۰۰۰', '۷۱۶٬۳۰۰٬۰۰۰', '۱۲۶٬۲۰۰٬۰۰۰'],
    year: ['۵٬۱۶۸٬۰۰۰٬۰۰۰', '۵٬۰۴۱٬۸۰۰٬۰۰۰', '۱۲۶٬۲۰۰٬۰۰۰'],
    feet: [
      '۴۲ فاکتور ثبت‌شده در این ماه',
      '۸۵٪ فروش این ماه وصول شده',
      '۱۸ فاکتور در انتظار دریافت',
    ],
    yearFeet: [
      '۲۸۶ فاکتور ثبت‌شده در سال',
      'مجموع دریافت‌های مرتبط با فروش',
      'مانده دریافتنی در پایان دوره',
    ],
    chart: 'فروش و وصول مطالبات',
    legend: ['فروش', 'وصول'],
    bars: [44, 35, 58, 52, 51, 48, 76, 66, 67, 58, 91, 77],
    insight: 'فاکتور ۱۰۴۲ با یک واریزی بانکی مطابقت دارد؛ بررسی و تأیید دریافت با شماست.',
  },
  bank: {
    name: 'بانک و خزانه',
    title: 'هر تراکنش، در جای درست خودش.',
    subtitle: 'وضعیت حساب‌های بانکی و جریان وجه نقد · ارقام به تومان',
    labels: ['موجودی نقد و بانک', 'دریافت‌های بانکی', 'پرداخت‌های بانکی'],
    month: ['۳۶۴٬۸۰۰٬۰۰۰', '۷۱۶٬۳۰۰٬۰۰۰', '۵۴۲٬۱۰۰٬۰۰۰'],
    year: ['۳۶۴٬۸۰۰٬۰۰۰', '۵٬۰۴۱٬۸۰۰٬۰۰۰', '۴٬۸۶۷٬۶۰۰٬۰۰۰'],
    feet: ['مانده مجموع ۳ حساب', '۳ واریزی آماده بررسی تطبیق', 'پرداخت‌های ثبت و تأییدشده'],
    yearFeet: [
      'مانده حساب‌ها در پایان دوره',
      'مجموع دریافت‌های سال مالی',
      'مجموع پرداخت‌های سال مالی',
    ],
    chart: 'دریافت و پرداخت بانکی',
    legend: ['دریافت', 'پرداخت'],
    bars: [52, 41, 46, 39, 65, 53, 58, 47, 73, 55, 88, 68],
    insight: '۳ پیشنهاد تطبیق آماده‌اند. هیچ دریافت یا سندی بدون تأیید شما ثبت نمی‌شود.',
  },
};

export const dashboardViews: { value: DashboardView; label: string }[] = [
  { value: 'overview', label: 'نمای کلی' },
  { value: 'sales', label: 'فروش و دریافت‌ها' },
  { value: 'bank', label: 'بانک و خزانه' },
];

export const dashboardSidebarItems: {
  value: DashboardView;
  label: string;
  icon: LandingIconName;
}[] = [
  { value: 'overview', label: 'نمای کلی', icon: 'grid' },
  { value: 'sales', label: 'فروش و دریافت‌ها', icon: 'receipt' },
  { value: 'bank', label: 'بانک و خزانه', icon: 'bank' },
];

export const dashboardStaticItems: { label: string; icon: LandingIconName }[] = [
  { label: 'کالا و انبار', icon: 'box' },
  { label: 'دفتر کل', icon: 'book' },
];

export const dashboardReportLinks: DashboardReportLink[] = [
  { label: 'دستیار هوشمند', icon: 'spark', count: '۳', href: '#intelligence' },
  { label: 'گزارش‌های مالی', icon: 'chart', href: '#scope' },
];

export const dashboardKpiIcons: LandingIconName[] = ['chart', 'receipt', 'wallet'];

export const dashboardTasks: {
  icon: LandingIconName;
  title: string;
  description: string;
  badge: string;
}[] = [
  {
    icon: 'bank',
    title: 'تطبیق واریزی بانک',
    description: '۳ تراکنش با پیشنهاد تطبیق',
    badge: 'بررسی',
  },
  {
    icon: 'receipt',
    title: 'فاکتور خرید ۰۲۸۱',
    description: 'آماده بررسی و ثبت نهایی',
    badge: 'تأیید',
  },
  {
    icon: 'book',
    title: 'کنترل اسناد مهرماه',
    description: '۲ مغایرت نیازمند بررسی',
    badge: 'پیگیری',
  },
];

export const dashboardLabelsMonth = ['اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر'];

export const dashboardLabelsYear = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور'];

export const landingDashboardData: DashboardData = {
  brandName: 'تراز',
  previewAriaLabel: 'پیش‌نمایش تعاملی داشبورد تراز با داده‌های نمونه',
  sidebarAriaLabel: 'بخش‌های پیش‌نمایش',
  viewsAriaLabel: 'نمای نمونه',
  viewSelectLabel: 'نمای داشبورد نمونه',
  periodAriaLabel: 'دوره گزارش',
  workspaceSectionLabel: 'فضای کاری',
  reportsSectionLabel: 'دستیار و گزارش‌ها',
  previewBadgeLabel: 'پیش‌نمایش تعاملی',
  workspace: {
    name: 'شرکت آتیه‌سازان',
    avatar: 'آ',
    meta: 'سال مالی ۱۴۰۵ · محیط نمونه',
  },
  user: {
    name: 'مریم رضایی',
    initials: 'م ر',
    role: 'حسابدار ارشد',
  },
  periodOptions: [
    { value: 'month', label: 'این ماه' },
    { value: 'year', label: 'امسال' },
  ],
  reports: dashboardReports,
  views: dashboardSidebarItems,
  staticItems: dashboardStaticItems,
  reportLinks: dashboardReportLinks,
  kpiIcons: dashboardKpiIcons,
  kpiUnit: 'تومان',
  tasksTitle: 'نیازمند بررسی شما',
  tasksCount: '۳ مورد',
  tasks: dashboardTasks,
  chartUnits: {
    month: 'میلیون تومان · ۶ ماه اخیر',
    year: 'میلیون تومان · نیمه نخست سال',
  },
  chartAriaLabelPrefix: 'نمودار نمونه',
  labelsMonth: dashboardLabelsMonth,
  labelsYear: dashboardLabelsYear,
  insightLinkLabel: 'بررسی پیشنهادها ←',
  insightHref: '#intelligence',
  footerNote: 'تمام ارقام این نما، نمونه هستند.',
};
