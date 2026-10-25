import { SectionLayout } from '@repo/web/ui';
import type { Metadata } from 'next';

import { DemoPage } from '@/core/features/landing/components/block/demo/DemoPage';

export const metadata: Metadata = {
  title: 'دموی تعاملی — تراز',
  description:
    'یک دور تعاملی با تراز: داشبورد مالی، جریان خرید و فروش و بررسی پیشنهاد تطبیق بانکی با داده‌های نمونه.',
};

export default function DemoRoute() {
  return (
    <SectionLayout>
      <DemoPage />
    </SectionLayout>
  );
}
