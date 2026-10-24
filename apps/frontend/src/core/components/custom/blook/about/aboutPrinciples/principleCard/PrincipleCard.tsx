import { cn } from '@/core/utils/shadcn/utils';
import { ComponentPropsWithoutRef } from 'react';

export interface PrincipleCardProps extends ComponentPropsWithoutRef<'article'> {
  number: string;
  title: string;
  description: string;
}


function PrincipleCard({ number, title, description, className, ...rest }: PrincipleCardProps) {
  return (
    <article
      className={cn(
        'border-t border-border py-[21px] sm:border-t-2 sm:py-[25px]',
        className,
      )}
      {...rest}
    >
      <span className="text-[11px] text-brand-link sm:text-xs">{number}</span>
      <h3 className="mt-[9px] mb-2 text-[19px] leading-[1.8] max-[900px]:text-base sm:mt-[13px] sm:text-lg">
        {title}
      </h3>
      <p className="text-xs leading-[2.2] text-muted-foreground max-[900px]:text-[11px]">
        {description}
      </p>
    </article>
  );
}

export default PrincipleCard;
