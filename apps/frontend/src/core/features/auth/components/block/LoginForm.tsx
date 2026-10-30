'use client';

import { Span } from '@repo/web/ui'; // اضافه شد
import { useForm } from 'react-hook-form';
import type * as z from 'zod/mini';
import { zodMiniResolver } from '@/core/lib/zod/zod';
import { useSignIn } from '../../hook/useSignIn';
import { loginFormSchema } from '../../lib/auth-schemas';
import { AuthField } from '../ui/Auth-Field/AuthField';
import { AuthFooter } from '../ui/Auth-Footer/AuthFooter';
import { AuthHeader } from '../ui/Auth-Header/AuthHeader';
import { AuthLink } from '../ui/Auth-Link/AuthLink';
import { AuthSubmitButton } from '../ui/Auth-Submit-Button/AuthSubmitButton';

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginForm() {
  const { signIn, loading } = useSignIn();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodMiniResolver(loginFormSchema),
    defaultValues: { email: '', password: '', remember: true },
  });

  const submit = handleSubmit(async (data) => {
    if (loading) return;
    await signIn(data);
  });

  return (
    <>
      <AuthHeader title="ورود به حساب" description="خوش برگشتید. برای ادامه وارد شوید." />

      <form onSubmit={submit} noValidate className="grid gap-4">
        <AuthField
          label="ایمیل"
          type="email"
          ltr
          autoComplete="username"
          placeholder="you@company.ir"
          error={errors.email?.message}
          {...register('email')}
        />
        <AuthField
          label="رمز عبور"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between gap-4">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" {...register('remember')} className="accent-primary size-4.5" />
            {/* استفاده از Span برای متن */}
            <Span className="text-sm text-muted-foreground">مرا به خاطر بسپار</Span>
          </label>
          <AuthLink href="/forgot" className="text-sm">
            فراموشی رمز؟
          </AuthLink>
        </div>

        <AuthSubmitButton loading={loading || isSubmitting}>ورود</AuthSubmitButton>
      </form>

      <AuthFooter text="حساب ندارید؟" href="/register" linkLabel="ثبت‌نام رایگان" />
    </>
  );
}
