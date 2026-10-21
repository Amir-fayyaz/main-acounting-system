'use client';

import type { FormEvent } from 'react';
import type { SignUpFormValues } from '../../assets/@types/auth.types';
import { useAuthForm } from '../../hook/useAuthForm';
import { useSignUp } from '../../hook/useSignUp';
import { PASSWORD_HINT, signUpSchema } from '../../lib/auth-schemas';
import { AuthField } from '../ui/Auth-Field/AuthField';
import { AuthFooter } from '../ui/Auth-Footer/AuthFooter';
import { AuthHeader } from '../ui/Auth-Header/AuthHeader';
import { AuthSubmitButton } from '../ui/Auth-Submit-Button/AuthSubmitButton';

export function RegisterForm() {
  const { values, errors, setValue, setErrors, validate } = useAuthForm<SignUpFormValues>(
    { displayName: '', email: '', password: '', password2: '' },
    signUpSchema,
  );
  const { signUp, loading } = useSignUp();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    const data = validate();
    if (!data) return;

    // password2 فقط برای اعتبارسنجی سمت کلاینت است و به API فرستاده نمی‌شود.
    const result = await signUp({
      displayName: data.displayName,
      email: data.email,
      password: data.password,
    });

    if (!result.ok) setErrors(result.fieldErrors);
  }

  return (
    <>
      <AuthHeader title="ساخت حساب جدید" description="۱۴ روز رایگان، بدون نیاز به کارت بانکی." />

      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <AuthField
          name="displayName"
          label="نام نمایشی"
          placeholder="مثلاً علی رضایی"
          autoComplete="name"
          value={values.displayName}
          error={errors.displayName}
          onChange={(e) => setValue('displayName', e.target.value)}
        />
        <AuthField
          name="email"
          label="ایمیل"
          type="email"
          ltr
          autoComplete="email"
          placeholder="you@company.ir"
          value={values.email}
          error={errors.email}
          onChange={(e) => setValue('email', e.target.value)}
        />
        <AuthField
          name="password"
          label="رمز عبور"
          type="password"
          autoComplete="new-password"
          placeholder={PASSWORD_HINT}
          value={values.password}
          error={errors.password}
          onChange={(e) => setValue('password', e.target.value)}
        />
        <AuthField
          name="password2"
          label="تکرار رمز عبور"
          type="password"
          autoComplete="new-password"
          placeholder="رمز عبور را مجدداً وارد کنید"
          value={values.password2}
          error={errors.password2}
          onChange={(e) => setValue('password2', e.target.value)}
        />

        <AuthSubmitButton loading={loading} loadingLabel="در حال ثبت‌نام...">
          ساخت حساب
        </AuthSubmitButton>
      </form>

      <AuthFooter text="قبلاً ثبت‌نام کرده‌اید؟" href="/login" linkLabel="وارد شوید" />
    </>
  );
}
