export interface AboutIntroDescriptionProps {
  text?: string;
}

function AboutIntroDescription({
  text = 'تراز یک سامانه مالی و حسابداری برای شرکت‌های ایرانی است؛ با یک هدف روشن: کمتر شدن کار تکراری و بیشتر شدن تسلط حسابدار بر جریان مالی.',
}: AboutIntroDescriptionProps) {
  return (
    <p className="max-w-[500px] text-xs leading-[2.3] text-muted-foreground max-[900px]:text-xs sm:text-sm">
      {text}
    </p>
  );
}

export default AboutIntroDescription;
