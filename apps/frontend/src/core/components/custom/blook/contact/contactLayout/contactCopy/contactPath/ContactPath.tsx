import { ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

export interface ContactPathProps {
  icon: LucideIcon;
  title: string;
  description: string;
  linkLabel: string;
  href: string;
}

function ContactPath({ icon: Icon, title, description, linkLabel, href }: ContactPathProps) {
  return (
    <div className="flex items-start gap-[11px] border-t border-border pt-4 max-[600px]:gap-[11px] sm:gap-3 sm:pt-[18px]">
      <Icon className="mt-[3px] size-[22px] text-brand-link" />

      <div>
        <strong className="block text-xs font-semibold sm:text-[13px]">{title}</strong>

        <p className="mt-[3px] text-[11px] leading-[2] text-muted-foreground">
          {description}
        </p>

        <Link
          className="mt-[7px] inline-flex items-center gap-[5px] text-[11px] text-brand-link"
          href={href}
        >
          {linkLabel}
          <ArrowLeft className="size-[14px]" />
        </Link>
      </div>
    </div>
  );
}

export default ContactPath;
