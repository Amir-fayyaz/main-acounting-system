/** Shared Tailwind class strings (shadcn semantic tokens only — works with your theme + dark mode). */
export const fieldClass =
  'h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 aria-[invalid=true]:border-destructive';

export const iconBtnClass =
  'inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40';

export const toneClass = {
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
  info: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  neutral: 'bg-muted text-muted-foreground',
} as const;
