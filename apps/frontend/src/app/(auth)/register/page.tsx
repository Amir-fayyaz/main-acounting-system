import { AuthShell } from "@/core/features/auth/components/block/AuthShell";
import { RegisterForm } from "@/core/features/auth/components/block/RegisterForm";

export const metadata = { title: "ثبت‌نام | مین‌حساب" };

export default function RegisterPage() {
  return (
    <AuthShell
      title="امروز شروع کنید، فردا گزارش مالی دقیق داشته باشید"
      subtitle="در کمتر از ۵ دقیقه حساب بسازید و اولین فاکتور را صادر کنید."
    >
      <RegisterForm />
    </AuthShell>
  );
}
