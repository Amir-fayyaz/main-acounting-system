import { cn } from '@repo/web/ui/utils/cn';
import {
  ArrowLeft,
  Banknote,
  Bell,
  BookOpen,
  Box,
  ChartNoAxesColumn,
  Check,
  ChevronDown,
  Clock,
  FileText,
  Grid2X2,
  History,
  Info,
  Link,
  LockKeyhole,
  Menu,
  Play,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export type LandingIconName =
  | 'logo'
  | 'arrow'
  | 'check'
  | 'grid'
  | 'receipt'
  | 'box'
  | 'bank'
  | 'chart'
  | 'book'
  | 'spark'
  | 'shield'
  | 'clock'
  | 'users'
  | 'file'
  | 'bell'
  | 'chevron'
  | 'menu'
  | 'play'
  | 'link'
  | 'lock'
  | 'history'
  | 'wallet'
  | 'plus'
  | 'info'
  | 'refresh'
  | 'search';

const iconMap = {
  logo: ChartNoAxesColumn,
  arrow: ArrowLeft,
  check: Check,
  grid: Grid2X2,
  receipt: Receipt,
  box: Box,
  bank: Banknote,
  chart: ChartNoAxesColumn,
  book: BookOpen,
  spark: Sparkles,
  shield: ShieldCheck,
  clock: Clock,
  users: Users,
  file: FileText,
  bell: Bell,
  chevron: ChevronDown,
  menu: Menu,
  play: Play,
  link: Link,
  lock: LockKeyhole,
  history: History,
  wallet: Wallet,
  plus: Plus,
  info: Info,
  refresh: RefreshCw,
  search: Search,
} satisfies Record<LandingIconName, LucideIcon>;

type LandingIconProps = {
  name: LandingIconName;
  className?: string;
};

export function LandingIcon({ name, className }: LandingIconProps) {
  const Icon = iconMap[name];

  return (
    <Icon
      aria-hidden="true"
      focusable="false"
      strokeWidth={1.7}
      className={cn('inline-block size-[22px] shrink-0', className)}
    />
  );
}
