import { cn } from '@/core/utils/shadcn/utils';
import { ComponentPropsWithoutRef } from 'react';

function Eyebrow({ className, children, ...rest }: ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      className={cn(
        'flex items-center gap-[9px] text-xs font-semibold text-eyebrow',
        'before:h-1.5 before:w-1.5 before:rounded-full before:bg-brand before:content-[""]',
        'max-taraz-sm:gap-[7px] max-taraz-sm:text-[10px]',
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export default Eyebrow;
