'use client';

import { CircleAlert, FileQuestion, KeyRound, ShieldX } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../../../shadcn/ui/button/button';
import { Card, CardContent } from '../../../shadcn/ui/card/card';
import { H1, P } from '../typography/Typography';
import { cn } from '@repo/web/ui/utils/cn';

export type ErrorType = 404 | 500 | 401 | 403;

export interface ErrorPresentationProps {
  type: ErrorType;
  title?: string;
  description?: string;
  retry?: () => void;
  onHome?: () => void;
  onBack?: () => void;
  onLogin?: () => void;
  className?: string;
}

const errorContent = {
  404: {
    title: 'صفحه پیدا نشد',
    description: 'نشانی واردشده معتبر نیست یا این صفحه دیگر در دسترس نیست.',
    Icon: FileQuestion,
    actions: [
      { label: 'بازگشت به خانه', callback: 'onHome', href: '/', variant: 'default' as const },
      { label: 'بازگشت به صفحه قبل', callback: 'onBack', variant: 'outline' },
    ],
  },
  500: {
    title: 'مشکلی پیش آمده است',
    description: 'در پردازش درخواست خطایی رخ داد. لطفاً دوباره تلاش کنید.',
    Icon: CircleAlert,
    actions: [
      { label: 'تلاش دوباره', callback: 'retry', variant: 'default' as const },
      { label: 'بازگشت به خانه', callback: 'onHome', href: '/', variant: 'outline' },
    ],
  },
  401: {
    title: 'ورود به حساب لازم است',
    description: 'برای ادامه، وارد حساب کاربری خود شوید.',
    Icon: KeyRound,
    actions: [
      { label: 'ورود به حساب', callback: 'onLogin', href: '/login', variant: 'default' as const },
      { label: 'بازگشت به خانه', callback: 'onHome', href: '/', variant: 'outline' },
    ],
  },
  403: {
    title: 'دسترسی مجاز نیست',
    description: 'حساب شما اجازه دسترسی به این بخش را ندارد.',
    Icon: ShieldX,
    actions: [
      { label: 'بازگشت به صفحه قبل', callback: 'onBack', variant: 'default' as const },
      { label: 'بازگشت به خانه', callback: 'onHome', href: '/', variant: 'outline' },
    ],
  },
} as const;

export function ErrorPresentation({
  type,
  title,
  description,
  retry,
  onHome,
  onBack,
  onLogin,
  className,
}: ErrorPresentationProps) {
  const content = errorContent[type];
  const callbacks = { retry, onHome, onBack, onLogin };
  const { Icon } = content;

  return (
    <Card
      role="alert"
      aria-labelledby="error-presentation-title"
      className={cn(
        'm-auto w-full max-w-md flex flex-col items-center gap-6 py-10 text-center sm:py-12',
        className
      )}
    >
      <CardContent className="flex flex-col items-center gap-4 px-2 text-foreground">
        <Icon className="size-12 text-destructive" aria-hidden="true" />
        <p className="text-sm font-semibold text-muted-foreground">{type}</p>
        <div className="space-y-1">
          <H1
            id="error-presentation-title"
            className="text-foreground text-xl font-semibold leading-tight tracking-tight sm:text-2xl"
          >
            {title ?? content.title}
          </H1>
          <P className="text-muted-foreground text-sm leading-relaxed">
            {description ?? content.description}
          </P>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {content.actions.map(({ label, callback, variant }) => {
            const onClick = callbacks[callback];
            const action = content.actions.find((item) => item.callback === callback);
            const href = action && 'href' in action ? action.href : undefined;
            const buttonVariant = variant ?? 'default';

            if (!onClick && href) {
              return (
                <Button key={callback} asChild variant={buttonVariant} className="flex-1 sm:flex-none">
                  <Link href={href}>{label}</Link>
                </Button>
              );
            }
            if (!onClick && callback === 'onBack') {
              return (
                <Button
                  key={callback}
                  type="button"
                  variant={buttonVariant}
                  className="flex-1 sm:flex-none"
                  onClick={() => window.history.back()}
                >
                  {label}
                </Button>
              );
            }
            if (!onClick) return null;

            return (
              <Button
                key={callback}
                type="button"
                variant={buttonVariant}
                className="flex-1 sm:flex-none"
                onClick={onClick}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
