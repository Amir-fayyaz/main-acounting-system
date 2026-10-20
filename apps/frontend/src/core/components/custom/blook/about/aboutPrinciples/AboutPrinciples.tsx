import Eyebrow from '@/core/components/custom/ui/eyebrow/Eyebrow';
import PrincipleCard from './PrincipleCard';

export interface Principle {
  number: string;
  title: string;
  description: string;
}

export interface AboutPrinciplesProps {
  eyebrow?: string;
  title?: string;
  principles?: Principle[];
  ribbonTitle?: string;
  ribbonText?: string;
}

const defaultPrinciples: Principle[] = [
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

function AboutPrinciples({
  eyebrow = 'اصولی که روی آن‌ها ساخته می‌شویم',
  title = 'یک ابزار مالی، با قواعد روشن.',
  principles = defaultPrinciples,
  ribbonTitle = '۸ جریان مالی،\nیک تصویر مشترک.',
  ribbonText = 'خرید، فروش، بانک، هزینه، کنترل مالی، حقوق، مالیات و دارایی ثابت؛ متصل به حسابداری. تمرکز نسخه نخست روی جریان‌های کامل و قابل استفاده برای شرکت واقعی است.',
}: AboutPrinciplesProps) {
  const [ribbonLead, ribbonAccent] = ribbonTitle.split('\n');

  return (
    <section className="py-[35px] pb-[45px] sm:py-[45px] sm:pb-[65px]">
      <Eyebrow>{eyebrow}</Eyebrow>

      <h2 className="mt-[13px] mb-[14px] text-[26px] leading-[1.75] tracking-[-0.8px] sm:text-[31px]">
        {title}
      </h2>

      <div className="mt-5 grid gap-0 sm:mt-[29px] sm:grid-cols-3 sm:gap-[25px] max-taraz-xl:gap-5">
        {principles.map((principle) => (
          <PrincipleCard
            description={principle.description}
            key={principle.number}
            number={principle.number}
            title={principle.title}
          />
        ))}
      </div>

      <div className="mt-[15px] rounded-xl border border-line bg-ribbon p-6 sm:mt-[25px] sm:grid sm:grid-cols-[1fr_2fr] sm:items-center sm:gap-10 sm:p-8">
        <strong className="text-[22px] leading-[1.8] tracking-[-0.5px] whitespace-pre-line">
          {ribbonLead}
          {'\n'}
          {ribbonAccent}
        </strong>
        <p className="mt-3 text-[11px] leading-[2.2] text-muted-foreground sm:mt-0 sm:text-xs">
          {ribbonText}
        </p>
      </div>
    </section>
  );
}

export default AboutPrinciples;
