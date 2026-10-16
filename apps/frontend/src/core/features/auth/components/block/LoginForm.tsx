"use client";
import {
  H1,
  Muted,
} from "@/core/components/custom/ui/typography/Typography";
import { Button } from "@/core/components/shadcn/ui/button/button";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import { useAuthForm } from "../../hook/useAuthForm";
import { useSignIn } from "../../hook/useSignIn";
import { signInSchema } from "../../lib/auth-schemas";
import { AuthField } from "../ui/AuthField";

export function LoginForm() {
  const { signIn, loading } = useSignIn();
  const { values, errors, setValue, validate } = useAuthForm<{ email: string; password: string; remember: boolean }>(
    { email: "", password: "", remember: true },
    signInSchema,
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const data = validate() as { email: string; password: string } | null;
    if (!data) return; // خطا زیر فیلد؛ بدون درخواست شبکه
    await signIn({ ...data, remember: values.remember });
  }

  return (
    <>
      <H1 className="text-start text-[1.8rem] leading-[1.6] sm:text-[1.8rem]">
        ورود به حساب
      </H1>
      <Muted className="mb-6 text-base">
        خوش برگشتید. برای ادامه وارد شوید.
      </Muted>

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
          onChange={(e) => setValue("email", e.target.value)}
        />
        <AuthField
          name="password"
          label="رمز عبور"
          type="password"
          autoComplete="current-password"
          value={values.password}
          error={errors.password}
          onChange={(e) => setValue("password", e.target.value)}
        />

        <div className="flex items-center justify-between gap-4 text-sm">
          <label className="text-muted-foreground flex items-center gap-2.5">
            <input
              type="checkbox"
              name="remember"
              checked={values.remember}
              onChange={(e) => setValue("remember", e.target.checked)}
              className="accent-primary size-[18px]"
            />
            مرا به خاطر بسپار
          </label>
          <Link href="/forgot" className="font-semibold text-[#b86a00]">
            فراموشی رمز؟
          </Link>
        </div>

        <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl text-base font-semibold">
          {loading && <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />}
          ورود
        </Button>
      </form>

      <p className="text-muted-foreground mt-5 text-center text-sm">
        حساب ندارید؟{" "}
        <Link href="/register" className="font-bold text-[#b86a00]">
          ثبت‌نام رایگان
        </Link>
      </p>
    </>
  );
}
