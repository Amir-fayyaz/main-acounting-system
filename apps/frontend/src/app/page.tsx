import { LandingPage } from '@/core/features/landing/components/block/landing/LandingPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'حسابداری یکپارچه با اختیار شما — تراز',
  description: 'تراز؛ سامانه مالی و حسابداری یکپارچه برای شرکت‌های ایرانی.',
};

export default function Home() {
  return <LandingPage />;
}
