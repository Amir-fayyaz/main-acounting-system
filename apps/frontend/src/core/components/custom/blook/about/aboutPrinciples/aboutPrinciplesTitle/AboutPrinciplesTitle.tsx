import Eyebrow from '@/core/components/custom/ui/eyebrow/Eyebrow';

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
      <Eyebrow>{eyebrow}</Eyebrow>

      <h2 className="mt-[13px] mb-[14px] text-[26px] leading-[1.75] tracking-[-0.8px] sm:text-[31px]">
        {title}
      </h2>
    </>
  );
}

export default AboutPrinciplesTitle;
