import { Sparkles } from 'lucide-react';

export function AboutManifesto() {
  return (
    <section className="my-[7px] mb-[15px] border-y border-border py-[26px] max-[600px]:block max-[900px]:grid max-[900px]:grid-cols-[150px_1fr] max-[900px]:gap-[25px] sm:my-5 sm:mb-10 sm:grid sm:grid-cols-[200px_1fr] sm:gap-10 sm:py-9">
      <span className="mb-[13px] flex items-start gap-2 text-[11px] text-brand-link max-[600px]:pt-0 sm:pt-[9px] sm:text-xs">
        <Sparkles className="size-4" />
        چرا تراز؟
      </span>
      <p className="text-xl leading-5 tracking-[-0.3px] font-semibold max-[600px]:leading-[2] sm:max-w-[820px] sm:text-[22px] sm:leading-[1.95] sm:tracking-[-0.5px] max-[900px]:text-[22px]">
        حسابدار باید وقتش را برای فهمیدن عددها بگذارد؛ نه برای نوشتن دوباره آن‌ها.
      </p>
    </section>
  );
}
