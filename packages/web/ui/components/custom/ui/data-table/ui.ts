/**
 * Single adaptation point for the host design system.
 * Every file in this folder imports shadcn primitives from here, so if your monorepo
 * paths differ you only need to touch THIS file.
 */
export {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/web/ui/components/shadcn/ui/table/table';

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@repo/web/ui/components/shadcn/ui/pagination/pagination';

export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/web/ui/components/shadcn/ui/select/select';

export { Button } from '@repo/web/ui/components/shadcn/ui/button/button';
export { Checkbox } from '@repo/web/ui/components/shadcn/ui/checkbox/checkbox';

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/web/ui/components/shadcn/ui/dropdown-menu/dropdown-menu';

export {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/web/ui/components/shadcn/ui/popover/popover';

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/web/ui/components/shadcn/ui/dialog/dialog';
