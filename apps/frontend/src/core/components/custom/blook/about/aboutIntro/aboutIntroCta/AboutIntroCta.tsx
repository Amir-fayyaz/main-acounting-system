import TarazIcon from '@/core/components/custom/ui/icons/TarazIcon';
import { Button } from '@/shadcn/button/button';
import Link from 'next/link';

export interface AboutIntroCtaProps {
  label?: string;
  href?: string;
}

function AboutIntroCta({ label = 'تراز را در عمل ببینید', href = '/demo' }: AboutIntroCtaProps) {
  return (
    <Button
      asChild
      className="mt-[21px] min-h-[42px] gap-2.5 rounded-lg px-[17px] text-[11px] font-semibold max-taraz-xl:mt-[25px] sm:mt-[25px] sm:min-h-12 sm:px-6 sm:text-xs"
    >
      <Link href={href}>
        {label}
        <TarazIcon className="size-4 sm:size-[19px]" name="arrow" />
      </Link>
    </Button>
  );
}

export default AboutIntroCta;
