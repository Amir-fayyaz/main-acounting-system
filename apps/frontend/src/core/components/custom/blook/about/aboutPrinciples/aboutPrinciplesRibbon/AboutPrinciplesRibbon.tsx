export interface AboutPrinciplesRibbonProps {
  title?: string;
  text?: string;
}

function AboutPrinciplesRibbon({
  title = '۸ جریان مالی،\nیک تصویر مشترک.',
  text = 'خرید، فروش، بانک، هزینه، کنترل مالی، حقوق، مالیات و دارایی ثابت؛ متصل به حسابداری. تمرکز نسخه نخست روی جریان‌های کامل و قابل استفاده برای شرکت واقعی است.',
}: AboutPrinciplesRibbonProps) {
  const [ribbonLead, ribbonAccent] = title.split('\n');

  return (
    <div className="mt-[15px] rounded-xl border border-border bg-card p-6 sm:mt-[25px] sm:grid sm:grid-cols-[1fr_2fr] sm:items-center sm:gap-10 sm:p-8">
      <strong className="text-[22px] leading-[1.8] tracking-[-0.5px] whitespace-pre-line">
        {ribbonLead}
        {'\n'}
        {ribbonAccent}
      </strong>
      <p className="mt-3 text-[11px] leading-[2.2] text-muted-foreground sm:mt-0 sm:text-xs">
        {text}
      </p>
    </div>
  );
}

export default AboutPrinciplesRibbon;
