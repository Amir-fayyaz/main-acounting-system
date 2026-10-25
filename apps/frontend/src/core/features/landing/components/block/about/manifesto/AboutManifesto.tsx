import { P, Span } from '@repo/web/ui';
import { Sparkles } from 'lucide-react';

export function AboutManifesto() {
  return (
    <section className="py-8 sm:py-12">
      <div className="border-y border-border py-6 sm:py-8 max-sm:block max-lg:grid max-lg:grid-cols-[auto_minmax(0,1fr)] max-lg:gap-6 sm:grid sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-10">
        <Span className="mb-3 flex items-start gap-2 text-xs text-brand-link max-sm:pt-0 sm:pt-2">
          <Sparkles className="size-4" />
          چرا تراز؟
        </Span>
        <P className="text-xl leading-5 tracking-tight font-semibold max-sm:leading-loose sm:max-w-200 sm:leading-loose">
          حسابدار باید وقتش را برای فهمیدن عددها بگذارد؛ نه برای نوشتن دوباره آن‌ها.
        </P>
      </div>
    </section>
  );
}
