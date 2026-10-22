import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** layout مخصوص auth: بدون Header/Sidebar داشبورد، تمام‌صفحه. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="bg-background min-h-screen w-full">{children}</div>;
}
