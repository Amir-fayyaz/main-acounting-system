'use client';

import { InputErrorMassage, Span } from '@/core/components/custom/ui/typography/Typography';
import { Button } from '@/core/components/shadcn/ui/button/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/core/components/shadcn/ui/input-otp/input-otp';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { ForgotStep1Values, ForgotStep2Values } from '../../assets/@types/auth.types';
import { useAuthForm } from '../../hook/useAuthForm';
import { PASSWORD_HINT, forgotStep1Schema, forgotStep2Schema } from '../../lib/auth-schemas';
import { normalizeDigits } from '../../utils/normalizeDigits';
import { AuthField } from '../ui/Auth-Field/AuthField';
import { AuthFooter } from '../ui/Auth-Footer/AuthFooter';
import { AuthHeader } from '../ui/Auth-Header/AuthHeader';
import { AuthSubmitButton } from '../ui/Auth-Submit-Button/AuthSubmitButton';

const OTP_LENGTH = 6;
const OTP_LENGTH_FA = OTP_LENGTH.toLocaleString('fa-IR');
const OTP_SLOTS = Array.from({ length: OTP_LENGTH }, (_, i) => i);

export function ForgotForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  const step1 = useAuthForm<ForgotStep1Values>({ id: '' }, forgotStep1Schema);
  const step2 = useAuthForm<ForgotStep2Values>({ otp: '', password: '' }, forgotStep2Schema);

  function sendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!step1.validate()) return;
    toast.success('کد ارسال شد (شبیه‌سازی)');
    setStep(2);
  }

  function resend() {
    toast.success('کد ارسال شد (شبیه‌سازی)');
  }

  function resetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!step2.validate()) return;
    toast.success('رمز عبور تغییر کرد. وارد شوید.');
    setTimeout(() => router.push('/login'), 1200);
  }

  return (
    <>
      {step === 1 ? (
        <>
          <AuthHeader
            title="بازیابی رمز عبور"
            description="ایمیل یا شماره موبایل خود را وارد کنید تا کد تأیید برایتان ارسال کنیم."
          />
          <form onSubmit={sendCode} noValidate className="grid gap-4">
            <AuthField
              name="id"
              label="ایمیل یا شماره موبایل"
              ltr
              autoComplete="username"
              placeholder="you@company.ir"
              value={step1.values.id}
              error={step1.errors.id}
              onChange={(e) => step1.setValue('id', normalizeDigits(e.target.value))}
            />
            <AuthSubmitButton>ارسال کد تأیید</AuthSubmitButton>
          </form>
        </>
      ) : (
        <>
          <AuthHeader
            title="کد تأیید را وارد کنید"
            description={`کد ${OTP_LENGTH_FA} رقمی به ${step1.values.id.trim()} ارسال شد.`}
          />
          <form onSubmit={resetPassword} noValidate className="grid gap-4">
            <div>
              <InputOTP
                maxLength={OTP_LENGTH}
                inputMode="numeric"
                autoFocus
                aria-label={`کد تأیید ${OTP_LENGTH_FA} رقمی`}
                value={step2.values.otp}
                onChange={(v) => step2.setValue('otp', normalizeDigits(v).replace(/\D/g, ''))}
                containerClassName="justify-center gap-2 [direction:ltr]"
              >
                <InputOTPGroup className="gap-2">
                  {OTP_SLOTS.map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="bg-card h-14 w-12 rounded-xl border font-sans text-xl"
                    />
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
              placeholder={PASSWORD_HINT}
              value={step2.values.password}
              error={step2.errors.password}
              onChange={(e) => step2.setValue('password', e.target.value)}
            />
            <AuthSubmitButton>تغییر رمز عبور</AuthSubmitButton>

            <div className="flex items-center justify-center gap-2">
              <Span className="text-sm text-muted-foreground">کد را دریافت نکردید؟</Span>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={resend}
                className="text-brand-link font-semibold"
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                ارسال مجدد
              </Button>
            </div>
          </form>
        </>
      )}

      <AuthFooter href="/login" linkLabel="بازگشت به ورود" />
    </>
  );
}
