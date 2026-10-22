import type {
  BenefitItem,
  FlowStep,
  WorkflowFlow,
  WorkflowTab,
} from '@/core/features/landing/assets/@types/sections';
import type { LandingIconName } from '@/core/features/landing/components/ui/icon/LandingIcon';

export type { BenefitItem, FlowStep, WorkflowFlow, WorkflowTab };

export const workflowBenefits: BenefitItem[] = [
  {
    title: 'ثبت یک‌باره، اثر در همه‌جا',
    description: 'خرید، فروش، انبار و خزانه از یک منبع اطلاعات تغذیه می‌شوند.',
  },
  {
    title: 'دسترسی متناسب با مسئولیت',
    description: 'هر همکار، اطلاعات و ابزارهای مربوط به نقش خودش را می‌بیند.',
  },
  {
    title: 'از گزارش تا سند اولیه',
    description: 'هر عدد قابل پیگیری است؛ تا رویدادی که آن را ساخته است.',
  },
];

export const assistantBenefits: BenefitItem[] = [
  {
    title: 'از ورود دستی به پیشنهاد و تأیید',
    description: 'داده‌ها از اسناد استخراج و برای بررسی شما آماده می‌شوند.',
  },
  {
    title: 'دلیل هر پیشنهاد، کنار خودش',
    description: 'منبع اطلاعات و نتیجه تطبیق را قبل از تأیید می‌بینید.',
  },
  {
    title: 'همیشه یک مسیر دستی دارید',
    description: 'برای انجام کار به پیشنهاد عامل هوشمند وابسته نیستید.',
  },
];

export const workflowFlows: Record<string, WorkflowFlow> = {
  sales: {
    label: 'فروش',
    steps: [
      {
        title: 'فاکتور فروش ۱۰۴۲',
        description: 'ثبت توسط فروشنده',
        value: '۳۲٬۰۰۰٬۰۰۰',
        unit: 'تومان',
        icon: 'receipt',
      },
      {
        title: 'خروج کالا از انبار مرکزی',
        description: 'حواله مرتبط با همان فاکتور',
        value: '۱۲−',
        unit: 'واحد کالا',
        icon: 'box',
      },
      {
        title: 'آماده‌سازی سند حسابداری',
        description: 'بدهکار: مشتری · بستانکار: فروش',
        value: 'برای بررسی',
        unit: 'حسابدار',
        icon: 'book',
      },
      {
        title: 'به‌روزرسانی گزارش‌های مالی',
        description: 'پس از تأیید و ثبت نهایی سند',
        value: 'همگام',
        unit: 'با دفتر کل',
        icon: 'chart',
      },
    ],
  },
  purchase: {
    label: 'خرید',
    steps: [
      {
        title: 'فاکتور خرید ۰۲۸۱',
        description: 'خرید از تأمین‌کننده پارس',
        value: '۲۴٬۰۰۰٬۰۰۰',
        unit: 'تومان',
        icon: 'receipt',
      },
      {
        title: 'ورود کالا به انبار مرکزی',
        description: 'رسید مرتبط با فاکتور خرید',
        value: '۲۰+',
        unit: 'واحد کالا',
        icon: 'box',
      },
      {
        title: 'ثبت پرداختنی و آماده‌سازی سند',
        description: 'بدهکار: موجودی · بستانکار: تأمین‌کننده',
        value: 'برای بررسی',
        unit: 'حسابدار',
        icon: 'book',
      },
      {
        title: 'به‌روزرسانی دفتر و مانده تأمین‌کننده',
        description: 'پس از تأیید و ثبت نهایی',
        value: 'همگام',
        unit: 'با دفتر کل',
        icon: 'chart',
      },
    ],
  },
  bank: {
    label: 'بانک',
    steps: [
      {
        title: 'ورود گردش حساب بانک',
        description: 'انتخاب فایل توسط حسابدار',
        value: '۱۶',
        unit: 'تراکنش نمونه',
        icon: 'bank',
      },
      {
        title: 'تطبیق با فاکتورهای باز',
        description: 'مقایسه مبلغ و شناسه پرداخت',
        value: '۳',
        unit: 'پیشنهاد تطبیق',
        icon: 'link',
      },
      {
        title: 'آماده‌سازی دریافت و سند',
        description: 'مستندات تطبیق برای بررسی',
        value: 'منتظر',
        unit: 'تأیید شما',
        icon: 'book',
      },
      {
        title: 'به‌روزرسانی مانده بانک و مشتری',
        description: 'پس از تأیید و ثبت دریافت',
        value: 'همگام',
        unit: 'با دفتر کل',
        icon: 'chart',
      },
    ],
  },
  payroll: {
    label: 'حقوق',
    steps: [
      {
        title: 'محاسبه حقوق دوره مهرماه',
        description: 'بر اساس اطلاعات تأییدشده کارکنان',
        value: '۱۲',
        unit: 'نفر',
        icon: 'users',
      },
      {
        title: 'آماده‌سازی بیمه و کسورات',
        description: 'محاسبات برای بازبینی حسابدار',
        value: 'برای بررسی',
        unit: 'مسئول حقوق',
        icon: 'file',
      },
      {
        title: 'پیش‌نویس سند حقوق و پرداختنی',
        description: 'کنترل اقلام حقوق و کسورات',
        value: 'منتظر',
        unit: 'تأیید شما',
        icon: 'book',
      },
      {
        title: 'ثبت هزینه و بدهی حقوق',
        description: 'پس از کنترل و تأیید نهایی',
        value: 'همگام',
        unit: 'با دفتر کل',
        icon: 'chart',
      },
    ],
  },
};

export const workflowTabs: WorkflowTab[] = [
  { key: 'sales', label: 'فروش' },
  { key: 'purchase', label: 'خرید' },
  { key: 'bank', label: 'بانک' },
  { key: 'payroll', label: 'حقوق' },
];

export const industryTags: { label: string; icon: LandingIconName }[] = [
  { label: 'بازرگانی', icon: 'box' },
  { label: 'فروشگاهی', icon: 'receipt' },
  { label: 'خدماتی', icon: 'file' },
];

export const outcomeAssurances: { title: string; description: string; icon: LandingIconName }[] = [
  {
    title: 'اطمینان از هر ثبت',
    description: 'اصلاح اسناد از مسیر کنترل‌شده',
    icon: 'lock',
  },
  {
    title: 'شفافیت در هر تغییر',
    description: 'ردیابی عملیات و مستندات مرتبط',
    icon: 'history',
  },
  {
    title: 'اختیار در هر تصمیم',
    description: 'تأیید حسابدار و مسیر دستی',
    icon: 'users',
  },
];

export const scopeModules: { title: string; description: string; icon: LandingIconName }[] = [
  {
    title: 'حسابداری و دفتر کل',
    description: 'اسناد، کنترل مالی و بستن دوره',
    icon: 'book',
  },
  { title: 'خرید و فروش', description: 'پرداختنی‌ها و دریافتنی‌ها', icon: 'receipt' },
  { title: 'بانک، صندوق و خزانه', description: 'دریافت، پرداخت و تطبیق', icon: 'bank' },
  { title: 'کالا و انبار', description: 'موجودی و گردش کالا', icon: 'box' },
  {
    title: 'حقوق و دستمزد',
    description: 'محاسبات، بیمه و ثبت حسابداری',
    icon: 'users',
  },
  {
    title: 'مالیات و صورتحساب',
    description: 'صورتحساب الکترونیکی و اسناد',
    icon: 'file',
  },
  { title: 'هزینه و دارایی ثابت', description: 'هزینه‌ها، استهلاک و حسابداری', icon: 'wallet' },
  {
    title: 'گزارش و کنترل دسترسی',
    description: 'داشبورد، نقش‌ها و اعلان‌ها',
    icon: 'chart',
  },
];

export const assistantTags = ['استخراج اطلاعات', 'تطبیق بانکی', 'پیشنهاد ثبت', 'ردیابی اجرا'];
