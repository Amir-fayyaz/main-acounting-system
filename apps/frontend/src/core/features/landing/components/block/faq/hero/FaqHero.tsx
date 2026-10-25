export function FaqHero() {
  return (
    <section className="mx-auto max-w-[800px] pt-[43px] pb-[30px] text-center max-[900px]:pt-[53px] sm:pt-[66px] sm:pb-[38px]">
      <span className="flex items-center justify-center gap-[9px] text-xs font-semibold text-brand-link before:h-1.5 before:w-1.5 before:rounded-full before:bg-brand before:content-['']">
        پرسش‌های متداول
      </span>
      <h1 className="my-[17px] text-[32px] leading-[1.65] tracking-[-1px] max-[900px]:text-[41px] max-[1100px]:text-[44px] sm:my-[17px] sm:text-[48px] sm:leading-[1.65] sm:tracking-[-1.8px]">
        پاسخ روشن،
        <br />
        <span className="text-brand-link">قبل از قدم بعدی.</span>
      </h1>
      <p className="mx-auto max-w-[570px] text-[12px] leading-[2.1] text-muted-foreground sm:text-[14px]">
        درباره شروع کار، جریان‌های مالی، اختیار حسابدار و این پیش‌نمایش بخوانید.
      </p>
    </section>
  );
}
