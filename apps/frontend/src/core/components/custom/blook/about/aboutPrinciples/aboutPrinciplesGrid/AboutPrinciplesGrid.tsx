import PrincipleCard from '../principleCard/PrincipleCard';

export interface Principle {
  number: string;
  title: string;
  description: string;
}

export interface AboutPrinciplesGridProps {
  principles?: Principle[];
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

function AboutPrinciplesGrid({ principles = defaultPrinciples }: AboutPrinciplesGridProps) {
  return (
    <div className="mt-5 grid gap-0 sm:mt-[29px] sm:grid-cols-3 sm:gap-[25px] max-[900px]:gap-5">
      {principles.map((principle) => (
        <PrincipleCard
          description={principle.description}
          key={principle.number}
          number={principle.number}
          title={principle.title}
        />
      ))}
    </div>
  );
}

export default AboutPrinciplesGrid;
