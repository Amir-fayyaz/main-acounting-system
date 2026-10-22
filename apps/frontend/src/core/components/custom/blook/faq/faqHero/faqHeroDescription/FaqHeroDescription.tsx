export interface FaqHeroDescriptionProps {
  text?: string;
}

function FaqHeroDescription({
  text = 'درباره شروع کار، جریان‌های مالی، اختیار حسابدار و این پیش‌نمایش بخوانید.',
}: FaqHeroDescriptionProps) {
  return (
    <p className="mx-auto max-w-[570px] text-[12px] leading-[2.1] text-muted-foreground sm:text-[14px]">
      {text}
    </p>
  );
}

export default FaqHeroDescription;
