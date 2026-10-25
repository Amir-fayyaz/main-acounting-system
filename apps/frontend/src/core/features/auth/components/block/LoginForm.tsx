'use client';

import { Span } from '@repo/web/ui'; // اضافه شد
import type { FormEvent } from 'react';
import { useAuthForm } from '../../hook/useAuthForm';
import { useSignIn } from '../../hook/useSignIn';
import { signInSchema } from '../../lib/auth-schemas';
import { AuthField } from '../ui/Auth-Field/AuthField';
import { AuthFooter } from '../ui/Auth-Footer/AuthFooter';
import { AuthHeader } from '../ui/Auth-Header/AuthHeader';
import { AuthLink } from '../ui/Auth-Link/AuthLink';
import { AuthSubmitButton } from '../ui/Auth-Submit-Button/AuthSubmitButton';

type LoginFormValues = { email: string; password: string; remember: boolean };

export function LoginForm() {
  const { signIn, loading } = useSignIn();
  const { values, errors, setValue, validate } = useAuthForm<LoginFormValues>(
    { email: '', password: '', remember: true },
    signInSchema,
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    const data = validate();
    if (!data) return;

    await signIn({ email: data.email, password: data.password, remember: values.remember });
  }

  return (
    <>
      <AuthHeader title="ورود به حساب" description="خوش برگشتید. برای ادامه وارد شوید." />

      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <AuthField
          name="email"
          label="ایمیل"
          type="email"
          ltr
          autoComplete="username"
          placeholder="you@company.ir"
          value={values.email}
          error={errors.email}
          onChange={(e) => setValue('email', e.target.value)}
        />
        <AuthField
          name="password"
          label="رمز عبور"
          type="password"
          autoComplete="current-password"
          value={values.password}
          error={errors.password}
          onChange={(e) => setValue('password', e.target.value)}
        />

        <div className="flex items-center justify-between gap-4">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="remember"
              checked={values.remember}
              onChange={(e) => setValue('remember', e.target.checked)}
              className="accent-primary size-4.5"
            />
            {/* استفاده از Span برای متن */}
            <Span className="text-sm text-muted-foreground">مرا به خاطر بسپار</Span>
          </label>
          <AuthLink href="/forgot" className="text-sm">
            فراموشی رمز؟
          </AuthLink>
        </div>

        <AuthSubmitButton loading={loading}>ورود</AuthSubmitButton>
      </form>

      <AuthFooter text="حساب ندارید؟" href="/register" linkLabel="ثبت‌نام رایگان" />
    </>
  );
}
