import TarazIcon from '@/core/components/custom/ui/icons/TarazIcon';
import type { TarazIconName } from '@/core/components/custom/ui/icons/TarazIcon';
import Link from 'next/link';

export interface ContactPathProps {
  icon: TarazIconName;
  title: string;
  description: string;
  linkLabel: string;
  href: string;
}

function ContactPath({ icon, title, description, linkLabel, href }: ContactPathProps) {
  return (
    <div className="flex items-start gap-[11px] border-t border-line pt-4 max-taraz-sm:gap-[11px] sm:gap-3 sm:pt-[18px]">
      <TarazIcon className="mt-[3px] size-[22px] text-contact-path-icon" name={icon} />

      <div>
        <strong className="block text-xs font-semibold sm:text-[13px]">{title}</strong>

        <p className="mt-[3px] text-[11px] leading-[2] text-muted-foreground">
          {description}
        </p>

        <Link
          className="mt-[7px] inline-flex items-center gap-[5px] text-[11px] text-contact-path-link"
          href={href}
        >
          {linkLabel}
          <TarazIcon className="size-[14px]" name="arrow" />
        </Link>
      </div>
    </div>
  );
}

export default ContactPath;
