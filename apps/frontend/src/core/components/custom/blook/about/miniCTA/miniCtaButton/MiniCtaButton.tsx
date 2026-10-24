import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shadcn/button/button';
import Link from 'next/link';

export interface MiniCtaButtonProps {
  label?: string;
  href?: string;
}

function MiniCtaButton({ label = 'دیدن محیط نمونه', href = '/demo' }: MiniCtaButtonProps) {
  return (
    <Button
      asChild
      className="mt-[19px] min-h-[42px] shrink-0 gap-2.5 rounded-lg bg-ink px-[17px] text-[11px] font-semibold text-white hover:bg-ink-soft sm:mt-0 sm:min-h-11 sm:px-6 sm:text-xs"
    >
      <Link href={href}>
        {label}
        <ArrowLeft className="size-4 sm:size-[18px]" />
      </Link>
    </Button>
  );
}

export default MiniCtaButton;
