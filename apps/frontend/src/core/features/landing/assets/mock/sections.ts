import type {
  AssistantSectionData,
  MiniCtaData,
  WorkflowSectionData,
} from '@/core/features/landing/assets/@types/sections';
import {
  assistantBenefits,
  assistantTags,
  workflowBenefits,
  workflowFlows,
  workflowTabs,
} from '@/core/features/landing/assets/mock/workspace';

export const landingWorkflowSectionData: WorkflowSectionData = {
  id: 'workflow',
  eyebrow: 'از رویداد مالی تا دفتر کل / ۰۲',
  title: {
    first: 'از فروش تا صورت‌های مالی،',
    second: 'بدون جابه‌جایی بین نرم‌افزارها.',
  },
  description:
    'وقتی همه‌چیز در یک سیستم است، حسابدار وقتش را صرف تحلیل می‌کند؛ نه تطبیق عددها در چند فایل مختلف.',
  benefits: workflowBenefits,
  cta: {
    label: 'همه بخش‌های تراز',
    href: '#scope',
  },
  boardTitle: 'یک عملیات، یک مسیر کامل',
  tabsAriaLabel: 'انتخاب جریان نمونه',
  tabs: workflowTabs,
  flows: workflowFlows,
  securityLabel: 'عملیات حساس با تأیید کاربر',
  footerCaption: 'یک نمونه از جریان کار',
  panelAriaLabel: 'جزئیات جریان انتخاب‌شده',
};

const assistantReviewLines = [
  { label: 'طرف حساب', value: 'شرکت کاوش ایرانیان' },
  { label: 'مبلغ واریزی', value: '۳۲٬۰۰۰٬۰۰۰ تومان' },
  { label: 'مستند پیشنهاد', value: 'مبلغ + شناسه پرداخت' },
] as const;

const assistantManualLines = [
  { label: 'شناسه پرداخت بانک', value: '۷۸۲۱۰۴۲' },
  { label: 'شناسه فاکتور', value: '۷۸۲۱۰۴۲' },
  { label: 'اختلاف مبلغ', value: '۰ تومان' },
] as const;

export const landingAssistantSectionData: AssistantSectionData = {
  id: 'intelligence',
  eyebrow: 'هوش در خدمت حسابدار / ۰۳',
  title: {
    first: 'دستیار شما،',
    second: 'نه تصمیم‌گیرنده به‌جای شما.',
  },
  description:
    'تراز اطلاعات را استخراج می‌کند، مغایرت‌ها را پیدا می‌کند و پیشنهاد می‌دهد. شما مستندات را می‌بینید، بررسی می‌کنید و تصمیم می‌گیرید.',
  benefits: assistantBenefits,
  tags: assistantTags,
  quote: 'ثبت نهایی، پرداخت و سایر عملیات حساس، فقط با تأیید کاربر انجام می‌شوند.',
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
    reviewLines: assistantReviewLines,
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
      lines: assistantManualLines,
      note: 'پیشنهاد را بررسی کنید؛ تأیید همچنان به انتخاب شماست.',
    },
    disclaimer: 'این یک نمایش محلی است؛ هیچ عملیات مالی واقعی انجام نمی‌شود.',
  },
};

export const landingMiniCtaData: MiniCtaData = {
  title: 'پاسخ پرسش‌تان را پیدا کنید.',
  description: 'درباره ثبت اسناد، اختیار حسابدار و شروع کار با تراز.',
  actionLabel: 'پرسش‌های متداول',
  href: '/faq',
};
