"use client";

import {
  H1,
  Muted,
} from "@/core/components/custom/ui/typography/Typography";
import { Button } from "@/core/components/shadcn/ui/button/button";
import Link from "next/link";
import { type FormEvent } from "react";
import { toast } from "sonner";

import type { SignUpFormValues } from "../../assets/@types/auth.types";
import { useAuthForm } from "../../hook/useAuthForm";
import { useSignUp } from "../../hook/useSignUp";
import { signUpSchema } from "../../lib/auth-schemas";
import { AuthField } from "../ui/Auth-Field/AuthField";

export function RegisterForm() {
  const { values, errors, setValue, validate } =
    useAuthForm<SignUpFormValues>(
      {
        displayName: "",
        email: "",
        password: "",
        password2: "",
      },
      signUpSchema,
    );

  const { signUp, loading } = useSignUp();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validate()) return;

    const success = await signUp({
      displayName: values.displayName,
      email: values.email,
      password: values.password,
    });

    if (success) {
      toast.success("ثبت‌نام با موفقیت انجام شد");
    }
  }

  return (
    <>
      <H1 className="text-start text-[1.8rem] leading-[1.6] sm:text-[1.8rem]">
        ساخت حساب جدید
      </H1>

      <Muted className="mb-6 text-base">
        ۱۴ روز رایگان، بدون نیاز به کارت بانکی.
      </Muted>

      <form
        onSubmit={onSubmit}
        noValidate
        className="grid gap-4 sm:grid-cols-2"
      >
        <AuthField
          wrapperClassName="sm:col-span-2"
          name="displayName"
          label="نام کاربری"
          placeholder="نام کاربری یا نام شرکت"
          autoComplete="name"
          value={values.displayName}
          error={errors.displayName}
          onChange={(e) =>
            setValue("displayName", e.target.value)
          }
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
          onChange={(e) =>
            setValue("email", e.target.value)
          }
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
          onChange={(e) =>
            setValue("password", e.target.value)
          }
        />

        <AuthField
          wrapperClassName="sm:col-span-2"
          name="password2"
          label="تکرار رمز عبور"
          type="password"
          autoComplete="new-password"
          placeholder="رمز عبور را مجدداً وارد کنید"
          value={values.password2}
          error={errors.password2}
          onChange={(e) =>
            setValue("password2", e.target.value)
          }
        />

        <div className="sm:col-span-2">
          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl text-base font-semibold"
          >
            {loading ? "در حال ثبت‌نام..." : "ساخت حساب"}
          </Button>
        </div>
      </form>

      <p className="text-muted-foreground mt-5 text-center text-sm">
        قبلاً ثبت‌نام کرده‌اید؟{" "}
        <Link
          href="/login"
          className="font-bold text-[#b86a00]"
        >
          وارد شوید
        </Link>
      </p>
    </>
  );
}
