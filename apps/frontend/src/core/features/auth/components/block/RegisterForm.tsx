'use client';

import { useForm } from 'react-hook-form';
import type * as z from 'zod/mini';
import { zodMiniResolver } from '@/core/lib/zod/zod';
import { useSignUp } from '../../hook/useSignUp';
import { PASSWORD_HINT, signUpSchema } from '../../lib/auth-schemas';
import { AuthField } from '../ui/Auth-Field/AuthField';
import { AuthFooter } from '../ui/Auth-Footer/AuthFooter';
import { AuthHeader } from '../ui/Auth-Header/AuthHeader';
import { AuthSubmitButton } from '../ui/Auth-Submit-Button/AuthSubmitButton';

type SignUpFormValues = z.infer<typeof signUpSchema>;

const SIGN_UP_FIELDS = ['displayName', 'email', 'password'] as const;

export function RegisterForm() {
  const { signUp, loading } = useSignUp();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodMiniResolver(signUpSchema),
    defaultValues: { displayName: '', email: '', password: '', password2: '' },
  });

  const submit = handleSubmit(async (data) => {
    if (loading) return;

    // password2 فقط برای اعتبارسنجی سمت کلاینت است و به API فرستاده نمی‌شود.
    const result = await signUp({
      displayName: data.displayName,
      email: data.email,
      password: data.password,
    });

    if (!result.ok) {
      for (const field of SIGN_UP_FIELDS) {
        const message = result.fieldErrors[field];
        if (message) setError(field, { type: 'server', message });
      }
    }
  });

  return (
    <>
      <AuthHeader title="ساخت حساب جدید" description="۱۴ روز رایگان، بدون نیاز به کارت بانکی." />

      <form onSubmit={submit} noValidate className="grid gap-4">
        <AuthField
          label="نام نمایشی"
          placeholder="مثلاً علی رضایی"
          autoComplete="name"
          error={errors.displayName?.message}
          {...register('displayName')}
        />
        <AuthField
          label="ایمیل"
          type="email"
          ltr
          autoComplete="email"
          placeholder="you@company.ir"
          error={errors.email?.message}
          {...register('email')}
        />
        <AuthField
          label="رمز عبور"
          type="password"
          autoComplete="new-password"
          placeholder={PASSWORD_HINT}
          error={errors.password?.message}
          {...register('password')}
        />
        <AuthField
          label="تکرار رمز عبور"
          type="password"
          autoComplete="new-password"
          placeholder="رمز عبور را مجدداً وارد کنید"
          error={errors.password2?.message}
          {...register('password2')}
        />

        <AuthSubmitButton loading={loading || isSubmitting} loadingLabel="در حال ثبت‌نام...">
          ساخت حساب
        </AuthSubmitButton>
      </form>

      <AuthFooter text="قبلاً ثبت‌نام کرده‌اید؟" href="/login" linkLabel="وارد شوید" />
    </>
  );
}
