'use client';

import {
  Button,
  InputErrorMassage,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  Span,
} from '@repo/web/ui';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useController, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type * as z from 'zod/mini';
import { zodMiniResolver } from '@/core/lib/zod/zod';
import { PASSWORD_HINT, forgotStep1Schema, forgotStep2Schema } from '../../lib/auth-schemas';
import { normalizeDigits } from '../../utils/normalizeDigits';
import { AuthField } from '../ui/Auth-Field/AuthField';
import { AuthFooter } from '../ui/Auth-Footer/AuthFooter';
import { AuthHeader } from '../ui/Auth-Header/AuthHeader';
import { AuthSubmitButton } from '../ui/Auth-Submit-Button/AuthSubmitButton';

const OTP_LENGTH = 6;
const OTP_LENGTH_FA = OTP_LENGTH.toLocaleString('fa-IR');
const OTP_SLOTS = Array.from({ length: OTP_LENGTH }, (_, i) => i);

type ForgotStep1Values = z.infer<typeof forgotStep1Schema>;
type ForgotStep2Values = z.infer<typeof forgotStep2Schema>;

export function ForgotForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [recoveryId, setRecoveryId] = useState('');

  const step1 = useForm<ForgotStep1Values>({
    resolver: zodMiniResolver(forgotStep1Schema),
    defaultValues: { id: '' },
  });
  const step2 = useForm<ForgotStep2Values>({
    resolver: zodMiniResolver(forgotStep2Schema),
    defaultValues: { otp: '', password: '' },
  });
  const {
    field: { ref: otpRef, ...otpField },
    fieldState: otpState,
  } = useController({
    control: step2.control,
    name: 'otp',
  });

  const sendCode = step1.handleSubmit((data) => {
    setRecoveryId(data.id);
    toast.success('کد ارسال شد (شبیه‌سازی)');
    setStep(2);
  });

  function resend() {
    toast.success('کد ارسال شد (شبیه‌سازی)');
  }

  const resetPassword = step2.handleSubmit(() => {
    toast.success('رمز عبور تغییر کرد. وارد شوید.');
    setTimeout(() => router.push('/login'), 1200);
  });

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
              label="ایمیل یا شماره موبایل"
              ltr
              autoComplete="username"
              placeholder="you@company.ir"
              error={step1.formState.errors.id?.message}
              {...step1.register('id', { setValueAs: normalizeDigits })}
            />
            <AuthSubmitButton loading={step1.formState.isSubmitting}>
              ارسال کد تأیید
            </AuthSubmitButton>
          </form>
        </>
      ) : (
        <>
          <AuthHeader
            title="کد تأیید را وارد کنید"
            description={`کد ${OTP_LENGTH_FA} رقمی به ${recoveryId} ارسال شد.`}
          />
          <form onSubmit={resetPassword} noValidate className="grid gap-4">
            <div>
              <InputOTP
                ref={otpRef}
                name={otpField.name}
                maxLength={OTP_LENGTH}
                inputMode="numeric"
                autoFocus
                aria-label={`کد تأیید ${OTP_LENGTH_FA} رقمی`}
                aria-invalid={otpState.invalid || undefined}
                aria-describedby={otpState.error ? 'otp-error' : undefined}
                value={otpField.value}
                onBlur={otpField.onBlur}
                onChange={(value) => otpField.onChange(normalizeDigits(value).replace(/\D/g, ''))}
                containerClassName="justify-center gap-2 [direction:ltr]"
              >
                <InputOTPGroup className="gap-2">
                  {OTP_SLOTS.map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="bg-card h-14 w-12 rounded-xl border "
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <InputErrorMassage id="otp-error" role="alert" className="text-center">
                {step2.formState.errors.otp?.message}
              </InputErrorMassage>
            </div>

            <AuthField
              label="رمز عبور جدید"
              type="password"
              autoComplete="new-password"
              placeholder={PASSWORD_HINT}
              error={step2.formState.errors.password?.message}
              {...step2.register('password')}
            />
            <AuthSubmitButton loading={step2.formState.isSubmitting}>
              تغییر رمز عبور
            </AuthSubmitButton>

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
