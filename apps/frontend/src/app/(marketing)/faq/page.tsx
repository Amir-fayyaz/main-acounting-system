import type { Metadata } from 'next';
import { FaqPage } from '@/core/features/landing/components/block/faq/FaqPage';

export const metadata: Metadata = {
  title: 'پرسش‌های متداول — تراز',
  description: 'پاسخ پرسش‌های متداول درباره شروع کار، عملیات مالی و دستیار هوشمند تراز.',
};

export default function FaqRoute() {
  return <FaqPage />;
}
