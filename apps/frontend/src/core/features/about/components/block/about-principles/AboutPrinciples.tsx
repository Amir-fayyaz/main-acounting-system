import { aboutPrinciples } from '../../../assets/mock/about';

export function AboutPrinciples() {
  return (
    <section className="py-[35px] pb-[45px] sm:py-[45px] sm:pb-[65px]">
      <span className="flex items-center gap-[9px] text-xs font-semibold text-brand-link before:h-1.5 before:w-1.5 before:rounded-full before:bg-brand before:content-['']">
        اصولی که روی آن‌ها ساخته می‌شویم
      </span>
      <h2 className="mt-[13px] mb-[14px] text-[26px] leading-[1.75] tracking-[-0.8px] sm:text-[31px]">
        یک ابزار مالی، با قواعد روشن.
      </h2>

      <div className="mt-5 grid gap-0 sm:mt-[29px] sm:grid-cols-3 sm:gap-[25px] max-[900px]:gap-5">
        {aboutPrinciples.map((principle) => (
          <article
            className="border-t border-border py-[21px] sm:border-t-2 sm:py-[25px]"
            key={principle.number}
          >
            <span className="text-[11px] text-brand-link sm:text-xs">{principle.number}</span>
            <h3 className="mt-[9px] mb-2 text-[19px] leading-[1.8] max-[900px]:text-base sm:mt-[13px] sm:text-lg">
              {principle.title}
            </h3>
            <p className="text-xs leading-[2.2] text-muted-foreground max-[900px]:text-[11px]">
              {principle.description}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-[15px] rounded-xl border border-border bg-card p-6 sm:mt-[25px] sm:grid sm:grid-cols-[1fr_2fr] sm:items-center sm:gap-10 sm:p-8">
        <strong className="text-[22px] leading-[1.8] tracking-[-0.5px] whitespace-pre-line">
          ۸ جریان مالی،
          <br />
          یک تصویر مشترک.
        </strong>
        <p className="mt-3 text-[11px] leading-[2.2] text-muted-foreground sm:mt-0 sm:text-xs">
          خرید، فروش، بانک، هزینه، کنترل مالی، حقوق، مالیات و دارایی ثابت؛ متصل به حسابداری. تمرکز
          نسخه نخست روی جریان‌های کامل و قابل استفاده برای شرکت واقعی است.
        </p>
      </div>
    </section>
  );
}
