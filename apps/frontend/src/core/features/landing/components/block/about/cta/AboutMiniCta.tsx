import { Button, H2, P, Span } from '@repo/web/ui';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface AboutMiniCtaProps {
  title?: string;
  description?: string;
  buttonLabel?: string;
  buttonHref?: string;
}

export function AboutMiniCta({
  title = 'مسیر کار خودتان را پیدا کنید.',
  description = 'از فروش و انبار تا تطبیق بانکی؛ همه با داده‌های نمونه قابل بررسی‌اند.',
  buttonLabel = 'دیدن محیط نمونه',
  buttonHref = '/demo',
}: AboutMiniCtaProps) {
  return (
    <section className="py-8 sm:py-12">
      <div className="block rounded-lg border border-border bg-sand p-6 sm:flex sm:items-center sm:justify-between sm:gap-9 sm:rounded-xl sm:px-8">
        <div>
          <H2 className="mb-1 text-xl leading-relaxed tracking-tight sm:text-2xl">{title}</H2>
          <P className="text-xs text-muted-foreground">{description}</P>
        </div>
        <Button
          asChild
          className="mt-5 min-h-10 shrink-0 gap-2.5 rounded-lg bg-ink px-4 text-xs font-semibold text-sand-soft hover:bg-ink-soft sm:mt-0 sm:min-h-11 sm:px-6"
        >
          <Link href={buttonHref}>
            <Span className="text-[length:inherit]">{buttonLabel}</Span>
            <ArrowLeft className="size-4 sm:size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
