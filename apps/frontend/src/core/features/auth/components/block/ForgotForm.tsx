"use client";
import {
  H1,
  InputErrorMassage,
  Muted,
} from "@/core/components/custom/ui/typography/Typography";
import { Button } from "@/core/components/shadcn/ui/button/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/core/components/shadcn/ui/input-otp/input-otp";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import type {
  ForgotStep1Values,
  ForgotStep2Values,
} from "../../assets/@types/auth.types";
import { useAuthForm } from "../../hook/useAuthForm";
import { forgotStep1Schema, forgotStep2Schema } from "../../lib/auth-schemas";
import { AuthField } from "../ui/Auth-Field/AuthField";

/** فارسی/عربی → انگلیسی (برای OTP) */
const toEn = (s: string) =>
  s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

const slotClass = "h-14 w-12 rounded-xl border text-xl font-sans bg-card";

/**
 * دو مرحله‌ای. endpoint بازیابی رمز در API فعلی وجود ندارد؛
 * بنابراین هر دو مرحله شبیه‌سازی (UI + toast) هستند.
 */
export function ForgotForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  const step1 = useAuthForm<ForgotStep1Values>({ id: "" }, forgotStep1Schema);
  const step2 = useAuthForm<ForgotStep2Values>({ otp: "", password: "" }, forgotStep2Schema);

  function sendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!step1.validate()) return;
    toast.success("کد ارسال شد (شبیه‌سازی)");
    setStep(2);
  }

  function resend() {
    toast.success("کد ارسال شد (شبیه‌سازی)");
  }

  function resetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!step2.validate()) return;
    toast.success("رمز عبور تغییر کرد. وارد شوید.");
    setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <>
      {step === 1 ? (
        <>
          <H1 className="text-start text-[1.8rem] leading-[1.6] sm:text-[1.8rem]">
            بازیابی رمز عبور
          </H1>
          <Muted className="mb-6 text-base">
            ایمیل یا شماره موبایل خود را وارد کنید تا کد تأیید برایتان ارسال کنیم.
          </Muted>
          <form onSubmit={sendCode} noValidate className="grid gap-4">
            <AuthField
              name="id"
              label="ایمیل یا شماره موبایل"
              ltr
              autoComplete="username"
              placeholder="you@company.ir"
              value={step1.values.id}
              error={step1.errors.id}
              onChange={(e) => step1.setValue("id", e.target.value)}
            />
            <Button type="submit" className="h-12 w-full rounded-xl text-base font-semibold">
              ارسال کد تأیید
            </Button>
          </form>
        </>
      ) : (
        <>
          <H1 className="text-start text-[1.8rem] leading-[1.6] sm:text-[1.8rem]">
            کد تأیید را وارد کنید
          </H1>
          <Muted className="mb-6 text-base">
            کد ۶ رقمی به {step1.values.id.trim()} ارسال شد.
          </Muted>
          <form onSubmit={resetPassword} noValidate className="grid gap-4">
            <div>
              <InputOTP
                maxLength={6}
                inputMode="numeric"
                autoFocus
                aria-label="کد تأیید ۶ رقمی"
                value={step2.values.otp}
                onChange={(v) => step2.setValue("otp", toEn(v).replace(/\D/g, ""))}
                containerClassName="justify-center gap-2 [direction:ltr]"
              >
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className={slotClass} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <InputErrorMassage role="alert" className="text-center">
                {step2.errors.otp}
              </InputErrorMassage>
            </div>

            <AuthField
              name="password"
              label="رمز عبور جدید"
              type="password"
              autoComplete="new-password"
              placeholder="حداقل ۸ کاراکتر"
              value={step2.values.password}
              error={step2.errors.password}
              onChange={(e) => step2.setValue("password", e.target.value)}
            />
            <Button type="submit" className="h-12 w-full rounded-xl text-base font-semibold">
              تغییر رمز عبور
            </Button>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">کد را دریافت نکردید؟</span>
              <button type="button" onClick={resend} className="font-semibold text-[#b86a00]">
                ارسال مجدد
              </button>
            </div>
          </form>
        </>
      )}

      <p className="text-muted-foreground mt-5 text-center text-sm">
        <Link href="/login" className="font-bold text-[#b86a00]">
          بازگشت به ورود
        </Link>
      </p>
    </>
  );
}
