import type { ReactNode } from "react";

/** layout مخصوص auth: بدون Header/Sidebar داشبورد، تمام‌صفحه. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="bg-background min-h-screen w-full">{children}</div>;
}
