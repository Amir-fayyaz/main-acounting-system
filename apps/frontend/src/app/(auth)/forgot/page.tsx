import { AuthShell } from "@/core/features/auth/components/block/AuthShell";
import { ForgotForm } from "@/core/features/auth/components/block/ForgotForm";

export const metadata = { title: "بازیابی رمز عبور | مین‌حساب" };

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
