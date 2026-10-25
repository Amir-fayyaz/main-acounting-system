import { H2, P, Span } from '@/core/components/custom/ui/typography/Typography';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { contactPaths } from '@/core/features/landing/assets/mock/contact';

export function ContactPaths() {
  return (
    <div>
      <H2 className="mb-3 text-2xl leading-relaxed tracking-tight sm:text-3xl">
        یک گفت‌وگوی خوب،
        <br />
        از مسئله واقعی شروع می‌شود.
      </H2>
      <P className="text-xs leading-loose text-muted-foreground">
        حجم عملیات، تعداد همکاران و بخشی که بیشترین دوباره‌کاری را دارد، نقطه شروع مناسبی است.
      </P>
      <div className="mt-5 flex flex-col gap-3.5 sm:mt-7 sm:gap-4">
        {contactPaths.map(({ icon: Icon, ...path }) => (
          <div
            className="flex items-start gap-2.5 border-t border-border pt-4 sm:gap-3"
            key={path.title}
          >
            <Icon className="mt-0.5 size-5 text-brand-link" />
            <div>
              <strong className="block text-xs font-semibold">
                <Span className="text-[length:inherit]">{path.title}</Span>
              </strong>
              <P className="mt-0.5 text-xs leading-loose text-muted-foreground">
                {path.description}
              </P>
              <Link
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-brand-link"
                href={path.href}
              >
                <Span className="text-[length:inherit]">{path.linkLabel}</Span>
                <ArrowLeft className="size-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
