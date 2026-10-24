import { AuthShell } from '@/core/features/auth/components/block/AuthShell';
import { ForgotForm } from '@/core/features/auth/components/block/ForgotForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'بازیابی رمز عبور',
  description: 'رمز عبور حساب مین‌حساب خود را بازیابی کنید.',
};

export default function ForgotPage() {
  return (
    <AuthShell
      title="رمزتان را فراموش کرده‌اید؟ اشکالی ندارد"
      subtitle="با چند ثانیه تأیید هویت، دوباره به حساب‌وکتابتان برگردید."
    >
      <ForgotForm />
    </AuthShell>
  );
}
