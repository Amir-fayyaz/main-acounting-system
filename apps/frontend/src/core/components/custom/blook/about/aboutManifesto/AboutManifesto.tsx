import TarazIcon from '@/core/components/custom/ui/icons/TarazIcon';

export interface AboutManifestoProps {
  label?: string;
  text?: string;
}

function AboutManifesto({
  label = 'چرا تراز؟',
  text = 'حسابدار باید وقتش را برای فهمیدن عددها بگذارد؛ نه برای نوشتن دوباره آن‌ها.',
}: AboutManifestoProps) {
  return (
    <section className="my-[7px] mb-[15px] border-y border-line py-[26px] max-taraz-sm:block max-taraz-xl:grid max-taraz-xl:grid-cols-[150px_1fr] max-taraz-xl:gap-[25px] sm:my-5 mb-10 sm:grid sm:grid-cols-[200px_1fr] sm:gap-10 sm:py-9">
      <span className="mb-[13px] flex items-start gap-2 text-[11px] text-manifesto-label max-taraz-sm:pt-0 sm:pt-[9px] sm:text-xs">
        <TarazIcon className="size-4" name="logo" />
        {label}
      </span>

      <p className="text-xl leading-5 tracking-[-0.3px] font-semibold max-taraz-sm:leading-[2] sm:text-[22px] sm:leading-[1.95] sm:tracking-[-0.5px] max-taraz-xl:text-[22px] sm:max-w-[820px]">
        {text}
      </p>
    </section>
  );
}

export default AboutManifesto;
