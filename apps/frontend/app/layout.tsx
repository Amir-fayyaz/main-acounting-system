import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'سامانه حسابداری هوشمند',
  description: 'سامانه مالی و حسابداری مبتنی بر عامل‌های هوشمند',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
