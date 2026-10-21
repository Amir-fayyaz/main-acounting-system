import { AuthShell } from "@/core/features/auth/components/block/AuthShell";
import { LoginForm } from "@/core/features/auth/components/block/LoginForm";

export const metadata = { title: "ورود | مین‌حساب" };

export default function LoginPage() {
  return (
    <AuthShell
      title="حساب‌وکتاب شما همان‌جا که گذاشتید منتظر است"
      subtitle="وارد شوید و آخرین وضعیت فروش، موجودی و خزانه را ببینید."
    >
      <LoginForm />
    </AuthShell>
  );
}
