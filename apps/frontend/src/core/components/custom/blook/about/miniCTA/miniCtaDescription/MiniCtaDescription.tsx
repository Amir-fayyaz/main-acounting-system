export interface MiniCtaDescriptionProps {
  children?: string;
}

function MiniCtaDescription({
  children = 'از فروش و انبار تا تطبیق بانکی؛ همه با داده‌های نمونه قابل بررسی‌اند.',
}: MiniCtaDescriptionProps) {
  return <p className="text-[11px] text-muted-foreground sm:text-xs">{children}</p>;
}

export default MiniCtaDescription;
