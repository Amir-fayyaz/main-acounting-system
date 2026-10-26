import { SectionLayout } from '@repo/web/ui';
import { LandingPage } from '@/core/features/landing/components/block/home/LandingPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'حسابداری یکپارچه با اختیار شما — تراز',
  description: 'تراز؛ سامانه مالی و حسابداری یکپارچه برای شرکت‌های ایرانی.',
};

export default function Home() {
  return (
    <SectionLayout>
      <LandingPage />
    </SectionLayout>
  );
}
