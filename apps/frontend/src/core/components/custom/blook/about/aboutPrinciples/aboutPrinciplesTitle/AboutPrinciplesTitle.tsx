
export interface AboutPrinciplesTitleProps {
  eyebrow?: string;
  title?: string;
}

function AboutPrinciplesTitle({
  eyebrow = 'اصولی که روی آن‌ها ساخته می‌شویم',
  title = 'یک ابزار مالی، با قواعد روشن.',
}: AboutPrinciplesTitleProps) {
  return (
    <>
      <span className="flex items-center gap-[9px] text-xs font-semibold text-brand-link before:h-1.5 before:w-1.5 before:rounded-full before:bg-brand before:content-['']">{eyebrow}</span>

      <h2 className="mt-[13px] mb-[14px] text-[26px] leading-[1.75] tracking-[-0.8px] sm:text-[31px]">
        {title}
      </h2>
    </>
  );
}

export default AboutPrinciplesTitle;
