import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { contactPaths } from '@/core/features/contact/assets/mock/contact';

export function ContactPaths() {
  return (
    <section>
      <h2 className="mb-[13px] text-[26px] leading-[1.8] tracking-[-0.7px] max-[900px]:text-[25px] sm:text-[28px]">
        یک گفت‌وگوی خوب،
        <br />
        از مسئله واقعی شروع می‌شود.
      </h2>
      <p className="text-xs leading-[2.2] text-muted-foreground sm:text-[13px]">
        حجم عملیات، تعداد همکاران و بخشی که بیشترین دوباره‌کاری را دارد، نقطه شروع مناسبی است.
      </p>
      <div className="mt-5 flex flex-col gap-[15px] max-[600px]:mt-[20px] sm:mt-[29px] sm:gap-[17px]">
        {contactPaths.map(({ icon: Icon, ...path }) => (
          <div
            className="flex items-start gap-[11px] border-t border-border pt-4 max-[600px]:gap-[11px] sm:gap-3 sm:pt-[18px]"
            key={path.title}
          >
            <Icon className="mt-[3px] size-[22px] text-brand-link" />
            <div>
              <strong className="block text-xs font-semibold sm:text-[13px]">{path.title}</strong>
              <p className="mt-[3px] text-[11px] leading-[2] text-muted-foreground">
                {path.description}
              </p>
              <Link
                className="mt-[7px] inline-flex items-center gap-[5px] text-[11px] text-brand-link"
                href={path.href}
              >
                {path.linkLabel}
                <ArrowLeft className="size-[14px]" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
