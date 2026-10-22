import { cn } from '@/core/utils/shadcn/utils';

export const tarazIconNames = [
  'logo',
  'arrow',
  'check',
  'grid',
  'receipt',
  'box',
  'bank',
  'chart',
  'book',
  'spark',
  'shield',
  'clock',
  'users',
  'file',
  'bell',
  'chevron',
  'menu',
  'play',
  'link',
  'lock',
  'history',
  'wallet',
  'plus',
  'info',
  'refresh',
  'search',
] as const;

export type TarazIconName = (typeof tarazIconNames)[number];

interface TarazIconProps {
  name: TarazIconName;
  className?: string;
}


function TarazIcon({ name, className }: TarazIconProps) {
  return (
    <svg aria-hidden="true" className={cn('tz-icon', className)}>
      <use href={`#i-${name}`} />
    </svg>
  );
}

export default TarazIcon;
