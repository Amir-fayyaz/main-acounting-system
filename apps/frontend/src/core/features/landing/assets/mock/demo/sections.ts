import type {
  AssistantSectionData,
  MiniCtaData,
  WorkflowFlow,
  WorkflowSectionData,
} from '@/core/features/landing/assets/@types/sections';

const demoWorkflowFlows: Record<string, WorkflowFlow> = {
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

export const demoWorkflowSectionData: WorkflowSectionData = {
  id: 'workflow',
  eyebrow: 'سناریوی دوم / یک رویداد، یک مسیر کامل',
  title: {
    first: 'از فاکتور شروع کنید.',
    second: 'تا دفتر کل دنبالش کنید.',
  },
  description: 'بین فروش، خرید، بانک و حقوق جابه‌جا شوید و ارتباط هر مرحله را با مرحله بعد ببینید.',
  benefits: [
    {
      title: 'ثبت یک‌باره اطلاعات',
      description: 'مستندات و رویدادها در یک جریان مشترک‌اند.',
    },
    {
      title: 'پیش‌نویس برای بررسی',
      description: 'عملیات حساس با کنترل و تأیید کاربر تکمیل می‌شوند.',
    },
  ],
  boardTitle: 'یک عملیات، یک مسیر کامل',
  tabsAriaLabel: 'انتخاب جریان نمونه',
  tabs: [
    { key: 'sales', label: 'فروش' },
    { key: 'purchase', label: 'خرید' },
    { key: 'bank', label: 'بانک' },
    { key: 'payroll', label: 'حقوق' },
  ],
  flows: demoWorkflowFlows,
  securityLabel: 'عملیات حساس با تأیید کاربر',
  footerCaption: 'یک نمونه از جریان کار',
  panelAriaLabel: 'جزئیات جریان انتخاب‌شده',
};

const demoAssistantReviewLines = [
  { label: 'طرف حساب', value: 'شرکت کاوش ایرانیان' },
  { label: 'مبلغ واریزی', value: '۳۲٬۰۰۰٬۰۰۰ تومان' },
  { label: 'مستند پیشنهاد', value: 'مبلغ + شناسه پرداخت' },
] as const;

const demoAssistantManualLines = [
  { label: 'شناسه پرداخت بانک', value: '۷۸۲۱۰۴۲' },
  { label: 'شناسه فاکتور', value: '۷۸۲۱۰۴۲' },
  { label: 'اختلاف مبلغ', value: '۰ تومان' },
] as const;

export const demoAssistantSectionData: AssistantSectionData = {
  id: 'intelligence',
  eyebrow: 'سناریوی سوم / پیشنهاد و تأیید',
  title: {
    first: 'یک تطبیق پیشنهادی را',
    second: 'خودتان بررسی کنید.',
  },
  description:
    'جزئیات بررسی دستی را باز کنید، مبلغ و شناسه‌ها را مقایسه کنید و نتیجه تأیید را در همین نمونه ببینید.',
  callout:
    'کلیک روی تأیید، فقط نتیجه نمونه را تغییر می‌دهد. هیچ دریافت بانکی یا سند واقعی ثبت نمی‌شود.',
  preview: {
    ariaLabel: 'پیش‌نمایش تعاملی دستیار مالی تراز',
    title: 'دستیار مالی تراز',
    badge: 'نمونه تعاملی',
    userMessage: 'این واریزی را با فاکتورهای باز بررسی کن.',
    attachment: 'گردش حساب مهرماه.xlsx',
    answer: {
      strong: 'یک تطبیق پیشنهادی پیدا شد.',
      text: 'مبلغ و شناسه پرداخت با فاکتور ۱۰۴۲ یکسان است. پیش‌نویس دریافت آماده بررسی شماست.',
    },
    approvedAnswer: {
      strong: 'پیشنهاد با تأیید شما تکمیل شد.',
      text: 'در محصول، این مرحله دریافت و سند مرتبط را ثبت می‌کند. در این صفحه فقط نتیجه نمونه را می‌بینید.',
    },
    reviewLines: demoAssistantReviewLines,
    statusLabel: 'وضعیت',
    status: {
      pending: 'منتظر تأیید شما',
      approved: 'تأیید شد · محیط نمونه',
    },
    approvalMessages: {
      pending: 'هنوز هیچ دریافت یا سند مالی ثبت نشده است.',
      approved: 'تأیید شما در این پیش‌نمایش شبیه‌سازی شد؛ هیچ سند واقعی ثبت نشده است.',
    },
    actions: {
      approve: 'تأیید در محیط نمونه',
      restart: 'شروع دوباره نمونه',
      manual: 'بررسی دستی',
      closeManual: 'بستن جزئیات',
      toastApproved: 'تأیید نمونه انجام شد. هیچ عملیات مالی واقعی اجرا نشد.',
      toastReset: 'نمونه به حالت اولیه برگشت.',
    },
    manualReview: {
      title: 'جزئیات برای بررسی حسابدار',
      lines: demoAssistantManualLines,
      note: 'پیشنهاد را بررسی کنید؛ تأیید همچنان به انتخاب شماست.',
    },
    disclaimer: 'این یک نمایش محلی است؛ هیچ عملیات مالی واقعی انجام نمی‌شود.',
  },
};

export const demoMiniCtaData: MiniCtaData = {
  title: 'برای فضای کاری خودتان آماده‌اید؟',
  description: 'جریان ورود و تکمیل اطلاعات حساب را هم در پیش‌نمایش امتحان کنید.',
  actionLabel: 'ورود یا ساخت حساب',
  href: '/auth',
};
