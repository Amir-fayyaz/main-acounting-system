"use client";
import {
  H1,
  InputErrorMassage,
  Muted,
} from "@/core/components/custom/ui/typography/Typography";
import { Button } from "@/core/components/shadcn/ui/button/button";
import Link from "next/link";
import type { FormEvent } from "react";
import { toast } from "sonner";
import type { RegisterFormValues } from "../../assets/@types/auth.types";
import { useAuthForm } from "../../hook/useAuthForm";
import { registerSchema } from "../../lib/auth-schemas";
import { AuthField } from "../ui/Auth-Field/AuthField";

export function RegisterForm() {
  const { values, errors, setValue, validate } = useAuthForm<RegisterFormValues>(
    {
      name: "",
      company: "",
      mobile: "",
      email: "",
      password: "",
      password2: "",
      terms: false,
    },
    registerSchema,
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    // endpoint ثبت‌نام هنوز در API وجود ندارد؛ بعد از اضافه‌شدن اینجا وصل شود.
    toast.info("ثبت‌نام در نسخه فعلی فقط از طریق پنل ادمین فعال است");
  }

  return (
    <>
      <H1 className="text-start text-[1.8rem] leading-[1.6] sm:text-[1.8rem]">
        ساخت حساب جدید
      </H1>
      <Muted className="mb-6 text-base">
        ۱۴ روز رایگان، بدون نیاز به کارت بانکی.
      </Muted>

      <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <AuthField
          name="name"
          label="نام و نام خانوادگی"
          autoComplete="name"
          value={values.name}
          error={errors.name}
          onChange={(e) => setValue("name", e.target.value)}
        />
        <AuthField
          name="company"
          label="نام شرکت"
          autoComplete="organization"
          value={values.company}
          error={errors.company}
          onChange={(e) => setValue("company", e.target.value)}
        />
        <AuthField
          wrapperClassName="sm:col-span-2"
          name="mobile"
          label="شماره موبایل"
          type="tel"
          ltr
          dir="ltr"
          autoComplete="tel"
          placeholder="09123456789"
          value={values.mobile}
          error={errors.mobile}
          onChange={(e) => setValue("mobile", e.target.value)}
        />
        <AuthField
          wrapperClassName="sm:col-span-2"
          name="email"
          label="ایمیل"
          type="email"
          ltr
          dir="ltr"
          autoComplete="email"
          placeholder="you@company.ir"
          value={values.email}
          error={errors.email}
          onChange={(e) => setValue("email", e.target.value)}
        />
        <AuthField
          wrapperClassName="sm:col-span-2"
          name="password"
          label="رمز عبور"
          type="password"
          autoComplete="new-password"
          placeholder="حداقل ۸ کاراکتر"
          value={values.password}
          error={errors.password}
          onChange={(e) => setValue("password", e.target.value)}
        />
        <AuthField
          wrapperClassName="sm:col-span-2"
          name="password2"
          label="تکرار رمز عبور"
          type="password"
          autoComplete="new-password"
          value={values.password2}
          error={errors.password2}
          onChange={(e) => setValue("password2", e.target.value)}
        />

        <div className="sm:col-span-2">
          <label className="text-muted-foreground flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              name="terms"
              checked={values.terms}
              onChange={(e) => setValue("terms", e.target.checked)}
              aria-invalid={errors.terms ? true : undefined}
              className="accent-primary mt-1.5 size-[18px] flex-none"
            />
            <span>
              <Link href="/terms" className="font-semibold text-[#b86a00]">
                قوانین و مقررات
              </Link>{" "}
              مین‌حساب را خوانده‌ام و می‌پذیرم.
            </span>
          </label>
          <InputErrorMassage role="alert">{errors.terms}</InputErrorMassage>
        </div>

        <div className="sm:col-span-2">
          <Button type="submit" className="h-12 w-full rounded-xl text-base font-semibold">
            ساخت حساب
          </Button>
        </div>
      </form>

      <p className="text-muted-foreground mt-5 text-center text-sm">
        قبلاً ثبت‌نام کرده‌اید؟{" "}
        <Link href="/login" className="font-bold text-[#b86a00]">
          وارد شوید
        </Link>
      </p>
    </>
  );
}
